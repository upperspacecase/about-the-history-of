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
  ANALYSIS_PROMPT,
  buildHeadlinePrompt,
  CRITIC_PROMPT,
} from "./research-prompt";
import { evidenceToPrompt, type EvidencePackage } from "./evidence";

/**
 * The fully automated production pipeline for one story:
 *
 *   evidence package -> analysis -> headline candidates -> deterministic
 *   validation -> automated critic -> publish or withhold.
 *
 * The verdict is generated first and the headline afterward. A story that
 * fails validation twice is withheld automatically; it is never sent to a
 * human queue and never published to fill the daily quota.
 */

const MODEL = "claude-opus-5";

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

const AnalysisSchema = z.object({
  topic: z.string(),
  summary: z.string(),
  whatChanged: z.string(),
  classification: z.enum(EVENT_CLASSIFICATIONS),
  scoreBreakdown: z.object({
    scale: z.number(),
    durability: z.number(),
    institutionalChange: z.number(),
    novelty: z.number(),
    spillovers: z.number(),
  }),
  significanceReason: z.string(),
  precedent: z.object({
    name: z.string(),
    similarity: z.string(),
    crucialDifference: z.string(),
  }),
  whatWouldChange: z.object({
    raise: z.string(),
    lower: z.string(),
  }),
  whyItMattersNow: z.string(),
  sourceAgreement: z.enum(["agree", "minor-disagreement", "major-disagreement"]),
  hasPrimarySource: z.boolean(),
  rapidlyDeveloping: z.boolean(),
  precedentStrength: z.enum(["strong", "moderate", "weak"]),
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
  /** The Long View verdict headline. */
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
   * the uncertainty prominently; the daily briefing never sets this.
   */
  allowLowConfidence?: boolean;
}

export type StoryResult =
  | { status: "published"; doc: StoryDoc }
  | { status: "withheld"; reasons: string[] };

/** Never let an en dash or em dash reach a published field. */
function stripDashes(text: string): string {
  return text
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s*–\s*/g, ", ")
    .replace(/, ([,.])/g, "$1");
}

async function runAnalysis(
  evidenceText: string,
  feedback: string[]
): Promise<Analysis> {
  const user =
    feedback.length === 0
      ? evidenceText
      : `${evidenceText}\n\nYOUR PREVIOUS ANALYSIS FAILED VALIDATION. Failure codes:\n${feedback
          .map((f) => `- ${f}`)
          .join("\n")}\nProduce a corrected analysis that fixes every failure above.`;

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: ANALYSIS_PROMPT,
    messages: [{ role: "user", content: user }],
    output_config: { format: zodOutputFormat(AnalysisSchema) },
  });
  if (!response.parsed_output) {
    throw new Error("Analysis call returned no parseable output");
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
  precedentName: string;
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
      model: MODEL,
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content: user }],
      output_config: { format: zodOutputFormat(HeadlineCandidatesSchema) },
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
  doc: StoryDoc
): Promise<{ pass: boolean; failures: { code: string; detail: string }[] }> {
  const user = [
    "EVIDENCE PACKAGE:",
    evidenceText,
    "",
    "COMPLETE STORY (as it would publish):",
    JSON.stringify(
      {
        sourceHeadline: doc.sourceHeadline,
        sourcePublisher: doc.sourcePublisher,
        verdictHeadline: doc.truthHeadline,
        classification: doc.classification,
        significance: doc.significance,
        scoreBreakdown: doc.scoreBreakdown,
        significanceReason: doc.significanceReason,
        confidence: doc.confidence,
        confidenceReasons: doc.confidenceReasons,
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
    model: MODEL,
    max_tokens: 16000,
    system: CRITIC_PROMPT,
    messages: [{ role: "user", content: user }],
    output_config: { format: zodOutputFormat(CriticSchema) },
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
    precedent: {
      name: clean(analysis.precedent.name),
      similarity: clean(analysis.precedent.similarity),
      crucialDifference: clean(analysis.precedent.crucialDifference),
    },
    whatWouldChange: {
      raise: clean(analysis.whatWouldChange.raise),
      lower: clean(analysis.whatWouldChange.lower),
    },
    sources: evidence.sources,
    topic: clean(analysis.topic),
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

  let feedback: string[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    const analysis = await runAnalysis(evidenceText, feedback);
    const breakdownTotal = normalizeBreakdown(analysis.scoreBreakdown);
    const confidence = computeConfidence({
      independentSourceCount: input.evidence.independentPublisherCount,
      hasPrimarySource: analysis.hasPrimarySource,
      sourceAgreement: analysis.sourceAgreement,
      rapidlyDeveloping:
        analysis.rapidlyDeveloping || input.evidence.rapidlyDeveloping,
      precedentStrength: analysis.precedentStrength,
      removedClaims: analysis.unsupportedClaimsRemoved.length,
    });

    if (confidence.level === "Low" && !input.allowLowConfidence) {
      return {
        status: "withheld",
        reasons: [
          `low confidence: ${confidence.reasons.join("; ")}`,
        ],
      };
    }

    const verdictSummary = [
      `What changed: ${analysis.whatChanged}`,
      `Classification: ${analysis.classification}`,
      `Provisional significance: ${breakdownTotal.total}/10 (${significanceLabel(breakdownTotal.total)})`,
      `Why: ${analysis.significanceReason}`,
      `Precedent: ${analysis.precedent.name}. Crucial difference: ${analysis.precedent.crucialDifference}`,
      `Confidence: ${confidence.level} (${confidence.reasons.join("; ")})`,
    ].join("\n");

    const headlineAttempt = await generateValidatedHeadline({
      evidenceText,
      verdictSummary,
      sourceHeadline: input.evidence.sourceHeadline,
      recentHeadlines: input.recentHeadlines,
      dynamicBans,
      precedentName: analysis.precedent.name,
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

    const critic = await runCritic(evidenceText, doc);
    if (critic.pass) {
      return { status: "published", doc };
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
