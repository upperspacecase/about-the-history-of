import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  EVENT_CLASSIFICATIONS,
  type HistoryResponse,
} from "./history-types";
import { normalizeBreakdown, significanceLabel } from "./significance";
import { computeConfidence } from "./confidence";
import { BANNED_PHRASES, detectOverusedLanguage } from "./banned-language";
import { validateHeadline } from "./headline-validate";
import { validateStory } from "./story-validate";
import {
  ANALYSIS_MODEL,
  ANALYSIS_PROMPT,
  buildHeadlinePrompt,
  CHECK_EFFORT,
  CHECK_MODEL,
  CRITIC_PROMPT,
  REVISE_PROMPT,
  TRIAGE_PROMPT,
} from "./research-prompt";
import {
  evidenceToPrompt,
  hasTierOnePublisher,
  type EvidencePackage,
} from "./evidence";
import { verifyHistory, type HistoryVerification } from "./research";

/**
 * The fully automated production pipeline for one story:
 *
 *   evidence package -> analysis (strong model, history from its own
 *   knowledge) -> web verification of the proposed history -> revision only
 *   when something was contradicted -> headline candidates -> deterministic
 *   validation -> automated critic -> publish or withhold.
 *
 * The analysis is generated first and the headline afterward. A story that
 * fails validation twice is withheld automatically; it is never sent to a
 * human queue and never published to fill a quota.
 */

const client = new Anthropic();

const TimelineEventSchema = z.object({
  year: z.string(),
  title: z.string(),
  description: z.string(),
  link: z.string(),
});

const PatternSchema = z.object({
  title: z.string(),
  description: z.string(),
});

const FurtherReadingSchema = z.object({
  title: z.string(),
  author: z.string(),
  type: z.string(),
  link: z.string(),
});

const ScoreBreakdownSchema = z.object({
  scale: z.number(),
  durability: z.number(),
  institutionalChange: z.number(),
  novelty: z.number(),
  spillovers: z.number(),
});

const TriageSchema = z.object({
  materialChange: z.boolean(),
  changeReason: z.string(),
  scoreBreakdown: ScoreBreakdownSchema,
});

const AnalysisSchema = z.object({
  topic: z.string(),
  /** Specific people, institutions, places central to the story. */
  entities: z.array(z.string()),
  /** 2-4 broad lowercase topic tags for the archive. */
  topics: z.array(z.string()),
  summary: z.string(),
  whatChanged: z.string(),
  /**
   * When a previous published account is supplied: is there a material
   * development beyond it? New wording, reactions, or re-reporting is not
   * material. Always true for first coverage.
   */
  materialChange: z.boolean(),
  changeReason: z.string(),
  background: z.string(),
  uncertainties: z.array(z.string()),
  whatToWatch: z.string(),
  classification: z.enum(EVENT_CLASSIFICATIONS),
  scoreBreakdown: ScoreBreakdownSchema,
  significanceReason: z.string(),
  precedent: z
    .object({
      name: z.string(),
      similarity: z.string(),
      crucialDifference: z.string(),
    })
    .nullable(),
  whatWouldChange: z.object({
    raise: z.string(),
    lower: z.string(),
  }),
  whyItMattersNow: z.string(),
  sourceAgreement: z.enum(["agree", "minor-disagreement", "major-disagreement"]),
  hasPrimarySource: z.boolean(),
  rapidlyDeveloping: z.boolean(),
  precedentStrength: z.enum(["strong", "moderate", "weak", "none"]),
  unsupportedClaimsRemoved: z.array(z.string()),
  timeline: z.array(TimelineEventSchema),
  patterns: z.array(PatternSchema),
  furtherReading: z.array(FurtherReadingSchema),
});

type Analysis = z.infer<typeof AnalysisSchema>;

const HeadlineCandidatesSchema = z.object({
  candidates: z.array(z.string()),
});

const CriticSchema = z.object({
  pass: z.boolean(),
  failures: z.array(
    z.object({
      code: z.string(),
      detail: z.string(),
    })
  ),
});

/** A publishable story. Field names match the stored document format. */
export interface StoryDoc
  extends Omit<
    HistoryResponse,
    "truthHeadline" | "significance" | "significanceReason"
  > {
  /** The original source headline (field name kept for stored documents). */
  headline: string;
  /** The editorial headline (field name kept for stored documents). */
  truthHeadline: string;
  significance: number;
  significanceReason: string;
}

export interface StoryGenerationInput {
  evidence: EvidencePackage;
  /** Previous published Long View headlines, most recent first (up to 50). */
  recentHeadlines: string[];
  /**
   * Publish a low-confidence story anyway. Only for surfaces that display
   * the uncertainty prominently; the daily briefing shows uncertainty on
   * every card, so it sets this.
   */
  allowLowConfidence?: boolean;
  /**
   * Our previous published account of this story, when it exists (STY 03).
   * whatChanged is then written as the difference from this account.
   */
  previousAccount?: {
    editorialHeadline: string;
    whatChanged: string;
    background: string;
    publishedAt: string;
  } | null;
}

export type StoryResult =
  | {
      status: "published";
      doc: StoryDoc;
      verification: HistoryVerification;
      changeReason?: string;
    }
  | { status: "no-material-change"; reason: string }
  | { status: "withheld"; reasons: string[] };

export type TriageResult =
  | { status: "candidate"; significance: number }
  | { status: "no-material-change"; reason: string };

/** Never let an en dash or em dash reach a published field. */
function stripDashes(text: string): string {
  return text
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s*–\s*/g, ", ")
    .replace(/, ([,.])/g, "$1");
}

function previousAccountToPrompt(
  previousAccount: StoryGenerationInput["previousAccount"]
): string {
  return previousAccount
    ? [
        "OUR PREVIOUS PUBLISHED ACCOUNT (write whatChanged as the difference from this; reuse still-accurate background):",
        JSON.stringify(previousAccount, null, 2),
      ].join("\n")
    : "";
}

/**
 * Cheap first pass on the check model: score and material-change decision
 * from the evidence package alone, no history, no web. The edition ranks
 * the pool on this and pays for full generation only in rank order.
 */
export async function triageStory(
  input: Pick<StoryGenerationInput, "evidence" | "previousAccount">
): Promise<TriageResult> {
  const parts = [evidenceToPrompt(input.evidence)];
  const previousAccountText = previousAccountToPrompt(input.previousAccount);
  if (previousAccountText) parts.push("", previousAccountText);

  const response = await client.messages.parse({
    model: CHECK_MODEL,
    max_tokens: 2048,
    system: [
      { type: "text", text: TRIAGE_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: parts.join("\n") }],
    output_config: {
      format: zodOutputFormat(TriageSchema),
      effort: CHECK_EFFORT,
    },
  });
  if (!response.parsed_output) {
    throw new Error("Triage call returned no parseable output");
  }
  const triage = response.parsed_output;
  if (input.previousAccount && !triage.materialChange) {
    return {
      status: "no-material-change",
      reason: triage.changeReason || "no material development",
    };
  }
  return {
    status: "candidate",
    significance: normalizeBreakdown(triage.scoreBreakdown).total,
  };
}

async function runAnalysis(
  evidenceText: string,
  previousAccountText: string,
  feedback: string[]
): Promise<Analysis> {
  const parts = [evidenceText];
  if (previousAccountText) {
    parts.push("", previousAccountText);
  }
  if (feedback.length > 0) {
    parts.push(
      "",
      "YOUR PREVIOUS ANALYSIS FAILED VALIDATION. Failure codes:",
      ...feedback.map((f) => `- ${f}`),
      "Produce a corrected analysis that fixes every failure above."
    );
  }

  const response = await client.messages.parse({
    model: ANALYSIS_MODEL,
    max_tokens: 16000,
    system: [
      { type: "text", text: ANALYSIS_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: parts.join("\n") }],
    output_config: { format: zodOutputFormat(AnalysisSchema) },
  });
  if (!response.parsed_output) {
    throw new Error("Analysis call returned no parseable output");
  }
  return response.parsed_output;
}

/**
 * Revision after verification, on the analysis model, only when at least
 * one historical claim was contradicted. The revised analysis replaces the
 * original; the critic then sees the findings alongside the story.
 */
async function reviseAnalysis(
  analysis: Analysis,
  verification: HistoryVerification
): Promise<Analysis> {
  const user = [
    "YOUR ANALYSIS:",
    JSON.stringify(analysis, null, 2),
    "",
    "VERIFICATION FINDINGS (P = precedent, T1.. = timeline entries in order, N1.. = patterns in order):",
    verification.summary,
  ].join("\n");

  const response = await client.messages.parse({
    model: ANALYSIS_MODEL,
    max_tokens: 16000,
    system: [
      { type: "text", text: REVISE_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: user }],
    output_config: { format: zodOutputFormat(AnalysisSchema) },
  });
  if (!response.parsed_output) {
    throw new Error("Revision call returned no parseable output");
  }
  return response.parsed_output;
}

interface HeadlineAttempt {
  headline: string | null;
  failureFeedback: string[];
}

async function generateValidatedHeadline(options: {
  evidenceText: string;
  verdictSummary: string;
  sourceHeadline: string;
  recentHeadlines: string[];
  dynamicBans: string[];
  precedentName?: string;
}): Promise<HeadlineAttempt> {
  let feedback: string[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    const { system, user } = buildHeadlinePrompt({
      evidenceText: options.evidenceText,
      verdictSummary: options.verdictSummary,
      bannedPhrases: BANNED_PHRASES,
      overusedLanguage: options.dynamicBans,
      recentHeadlines: options.recentHeadlines,
      failureFeedback: feedback.length > 0 ? feedback : undefined,
    });

    const response = await client.messages.parse({
      model: CHECK_MODEL,
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content: user }],
      output_config: {
        format: zodOutputFormat(HeadlineCandidatesSchema),
        effort: CHECK_EFFORT,
      },
    });

    const candidates = (response.parsed_output?.candidates ?? [])
      .map((c) => stripDashes(c.trim()))
      .filter(Boolean);

    feedback = [];
    for (const candidate of candidates) {
      const failures = validateHeadline(candidate, {
        sourceHeadline: options.sourceHeadline,
        recentHeadlines: options.recentHeadlines,
        dynamicBans: options.dynamicBans,
        precedentName: options.precedentName,
      });
      if (failures.length === 0) {
        return { headline: candidate, failureFeedback: [] };
      }
      feedback.push(
        `"${candidate}": ${failures.map((f) => `${f.code} (${f.detail})`).join("; ")}`
      );
    }
  }

  return { headline: null, failureFeedback: feedback };
}

async function runCritic(
  evidenceText: string,
  verificationSummary: string,
  doc: StoryDoc
): Promise<{ pass: boolean; failures: { code: string; detail: string }[] }> {
  const user = [
    "EVIDENCE PACKAGE:",
    evidenceText,
    "",
    "HISTORICAL VERIFICATION FINDINGS (P = precedent, T1.. = timeline entries in order, N1.. = patterns in order; already applied to the story):",
    verificationSummary || "(no historical claims were checked)",
    "",
    "COMPLETE STORY (as it would publish):",
    JSON.stringify(
      {
        sourceHeadline: doc.sourceHeadline,
        sourcePublisher: doc.sourcePublisher,
        editorialHeadline: doc.truthHeadline,
        classification: doc.classification,
        significance: doc.significance,
        scoreBreakdown: doc.scoreBreakdown,
        significanceReason: doc.significanceReason,
        confidence: doc.confidence,
        confidenceReasons: doc.confidenceReasons,
        whatChanged: doc.whatChanged,
        background: doc.background,
        uncertainties: doc.uncertainties,
        whatToWatch: doc.whatToWatch,
        summary: doc.summary,
        whyItMattersNow: doc.whyItMattersNow,
        precedent: doc.precedent,
        whatWouldChange: doc.whatWouldChange,
        timeline: doc.timeline,
        patterns: doc.patterns,
      },
      null,
      2
    ),
  ].join("\n");

  const response = await client.messages.parse({
    model: CHECK_MODEL,
    max_tokens: 4096,
    system: [
      { type: "text", text: CRITIC_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: user }],
    output_config: {
      format: zodOutputFormat(CriticSchema),
      effort: CHECK_EFFORT,
    },
  });
  if (!response.parsed_output) {
    return {
      pass: false,
      failures: [{ code: "critic-error", detail: "critic returned no output" }],
    };
  }
  return response.parsed_output;
}

function assembleDoc(
  evidence: EvidencePackage,
  analysis: Analysis,
  headline: string,
  breakdownTotal: { breakdown: StoryDoc["scoreBreakdown"]; total: number },
  confidence: { level: NonNullable<StoryDoc["confidence"]>; reasons: string[] }
): StoryDoc {
  const nowIso = new Date().toISOString();
  const clean = stripDashes;
  return {
    headline: evidence.sourceHeadline,
    sourceHeadline: evidence.sourceHeadline,
    sourcePublisher: evidence.sourcePublisher,
    sourceUrl: evidence.sourceUrl,
    truthHeadline: headline,
    significance: breakdownTotal.total,
    significanceReason: clean(analysis.significanceReason),
    classification: analysis.classification,
    scoreBreakdown: breakdownTotal.breakdown,
    confidence: confidence.level,
    confidenceReasons: confidence.reasons,
    whatChanged: clean(analysis.whatChanged),
    background: clean(analysis.background),
    uncertainties: analysis.uncertainties.map(clean).filter(Boolean),
    whatToWatch: clean(analysis.whatToWatch ?? ""),
    precedent: analysis.precedent
      ? {
          name: clean(analysis.precedent.name),
          similarity: clean(analysis.precedent.similarity),
          crucialDifference: clean(analysis.precedent.crucialDifference),
        }
      : undefined,
    whatWouldChange: {
      raise: clean(analysis.whatWouldChange.raise),
      lower: clean(analysis.whatWouldChange.lower),
    },
    sources: evidence.sources,
    topic: clean(analysis.topic),
    entities: analysis.entities.map(clean).filter(Boolean).slice(0, 16),
    topics: analysis.topics
      .map((t) => clean(t).toLowerCase())
      .filter(Boolean)
      .slice(0, 6),
    summary: clean(analysis.summary),
    timeline: analysis.timeline.map((t) => ({
      ...t,
      title: clean(t.title),
      description: clean(t.description),
    })),
    patterns: analysis.patterns.map((p) => ({
      title: clean(p.title),
      description: clean(p.description),
    })),
    furtherReading: analysis.furtherReading,
    whyItMattersNow: clean(analysis.whyItMattersNow),
    generatedAtIso: nowIso,
    updatedAtIso: nowIso,
  };
}

export async function generateStory(
  input: StoryGenerationInput
): Promise<StoryResult> {
  const evidenceText = evidenceToPrompt(input.evidence);
  const overused = detectOverusedLanguage(input.recentHeadlines);
  const dynamicBans = [...overused.words, ...overused.bigrams];
  const previousAccountText = previousAccountToPrompt(input.previousAccount);

  let feedback: string[] = [];
  // The web check runs once per story: the history does not change between
  // validation attempts unless the critic sends the analysis back.
  let verification: HistoryVerification | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const rawAnalysis = await runAnalysis(
      evidenceText,
      previousAccountText,
      feedback
    );
    // No-material-change is a decision, not a failure (PRD §8): the story
    // stays covered, no new card is created.
    if (input.previousAccount && !rawAnalysis.materialChange) {
      return {
        status: "no-material-change",
        reason: rawAnalysis.changeReason || "no material development",
      };
    }

    if (!verification || attempt > 0) {
      verification = await verifyHistory({
        timeline: rawAnalysis.timeline,
        patterns: rawAnalysis.patterns,
        precedent: rawAnalysis.precedent,
      });
    }
    const contradicted = verification.verdicts.filter(
      (v) => v.verdict === "contradicted"
    );
    const analysis =
      contradicted.length > 0
        ? await reviseAnalysis(rawAnalysis, verification)
        : rawAnalysis;

    // The central comparison failed and the revision found no honest
    // replacement: reject rather than publish a story built on it.
    if (
      contradicted.some((v) => v.id === "P") &&
      !analysis.precedent
    ) {
      return {
        status: "withheld",
        reasons: [
          `central comparison contradicted: ${contradicted.find((v) => v.id === "P")?.note ?? ""}`,
        ],
      };
    }

    const breakdownTotal = normalizeBreakdown(analysis.scoreBreakdown);
    const confidence = computeConfidence({
      independentSourceCount: input.evidence.independentOriginCount,
      hasReputableSource: hasTierOnePublisher(
        input.evidence.sources.map((s) => s.publisher)
      ),
      hasPrimarySource: analysis.hasPrimarySource,
      sourceAgreement: analysis.sourceAgreement,
      rapidlyDeveloping:
        analysis.rapidlyDeveloping || input.evidence.rapidlyDeveloping,
      precedentStrength:
        analysis.precedentStrength === "none"
          ? "weak"
          : analysis.precedentStrength,
      removedClaims: analysis.unsupportedClaimsRemoved.length,
    });

    if (confidence.level === "Low" && !input.allowLowConfidence) {
      return {
        status: "withheld",
        reasons: [`low confidence: ${confidence.reasons.join("; ")}`],
      };
    }

    const verdictSummary = [
      `What changed: ${analysis.whatChanged}`,
      `Why it matters: ${analysis.whyItMattersNow}`,
      `Classification: ${analysis.classification}`,
      `Internal significance: ${breakdownTotal.total}/10 (${significanceLabel(breakdownTotal.total)})`,
      `Why: ${analysis.significanceReason}`,
      analysis.precedent
        ? `Comparison: ${analysis.precedent.name}. Where it breaks down: ${analysis.precedent.crucialDifference}`
        : "Comparison: none supported.",
      `Uncertainties: ${analysis.uncertainties.join(" | ") || "none stated"}`,
      `Confidence: ${confidence.level} (${confidence.reasons.join("; ")})`,
    ].join("\n");

    const headlineAttempt = await generateValidatedHeadline({
      evidenceText,
      verdictSummary,
      sourceHeadline: input.evidence.sourceHeadline,
      recentHeadlines: input.recentHeadlines,
      dynamicBans,
      precedentName: analysis.precedent?.name,
    });

    if (!headlineAttempt.headline) {
      feedback = headlineAttempt.failureFeedback;
      continue;
    }

    const doc = assembleDoc(
      input.evidence,
      analysis,
      headlineAttempt.headline,
      breakdownTotal,
      confidence
    );

    const deterministicFailures = validateStory(doc);
    if (deterministicFailures.length > 0) {
      feedback = deterministicFailures.map((f) => `${f.code}: ${f.detail}`);
      continue;
    }

    const critic = await runCritic(evidenceText, verification.summary, doc);
    if (critic.pass) {
      return {
        status: "published",
        doc,
        verification,
        changeReason: input.previousAccount
          ? stripDashes(rawAnalysis.changeReason)
          : undefined,
      };
    }
    feedback = critic.failures.map((f) => `${f.code}: ${f.detail}`);
  }

  return {
    status: "withheld",
    reasons:
      feedback.length > 0
        ? feedback
        : ["story failed validation twice with no recoverable output"],
  };
}
