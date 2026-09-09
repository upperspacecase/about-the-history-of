// Version-aware story drafting from a retrieved evidence package (PRD §7).
// Draft call: claude-opus-5 with the web_search server tool for background
// and historical grounding. Critic call: same model, no tools, checks the
// draft against the evidence actually provided (EVD 08).

import Anthropic from "@anthropic-ai/sdk";
import {
  STORY_PROMPT,
  UPDATE_ADDENDUM,
  CRITIC_PROMPT,
} from "./research-prompt";
import type { EvidencePackage } from "./evidence";
import type { StoryVersion, StoryVersionDraft } from "./story-types";
import { applyGate } from "./story-validate";

const MODEL = "claude-opus-5";
const MAX_SEARCHES = 8;
const MAX_PAUSE_RESUMES = 6;

const client = new Anthropic();

export interface WebSourceRef {
  id: string;
  url: string;
  title: string;
  publisher: string;
}

export interface DraftResult {
  decision: "publish" | "withhold";
  withholdReason?: string;
  editorialHeadline?: string;
  whatChanged?: string;
  whyItMatters?: string;
  background?: string;
  uncertainties?: string[];
  whatToWatch?: string;
  timeline?: { date: string; text: string; evidenceIds: string[] }[];
  comparison?: { text: string; limitation: string; evidenceIds: string[] };
  claims?: {
    text: string;
    type: string;
    evidenceIds: string[];
    essential: boolean;
  }[];
  entities?: string[];
  topics?: string[];
  webSources?: WebSourceRef[];
  singleOrigin?: string;
}

export interface DraftOutcome {
  draft: DraftResult;
  searchedUrls: Set<string>; // every URL actually received from web search
}

export function parseModelJson<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new SyntaxError("no JSON object in response");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

function collectSearchUrls(content: Anthropic.ContentBlock[], into: Set<string>) {
  for (const block of content) {
    if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const result of block.content) {
        if (result.type === "web_search_result" && result.url) into.add(result.url);
      }
    }
  }
}

function finalText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

function evidenceBlock(evidence: EvidencePackage): string {
  const lines = evidence.items.map(
    (item) =>
      `<evidence id="${item.id}" publisher="${item.publisher}" accessMode="${item.accessMode}" url="${item.url}">\n` +
      `Title: ${item.title}\n${item.passage}\n</evidence>`
  );
  return [
    `Independent reporting origins in this package: ${evidence.independentOrigins}`,
    ...lines,
  ].join("\n\n");
}

export async function draftStory(
  evidence: EvidencePackage,
  previousVersion: StoryVersion | null,
  feedback?: string
): Promise<DraftOutcome> {
  const system = previousVersion ? STORY_PROMPT + UPDATE_ADDENDUM : STORY_PROMPT;

  const userParts = [evidenceBlock(evidence)];
  if (feedback) {
    userParts.push(
      `<previous_attempt_rejected>\nYour previous draft failed the publication gate: ${feedback}\nFix exactly this — support or drop the affected material.\n</previous_attempt_rejected>`
    );
  }
  if (previousVersion) {
    userParts.push(
      `<previous_published_version>\n${JSON.stringify(
        {
          editorialHeadline: previousVersion.editorialHeadline,
          whatChanged: previousVersion.whatChanged,
          whyItMatters: previousVersion.whyItMatters,
          background: previousVersion.background,
          uncertainties: previousVersion.uncertainties,
          publishedAt: previousVersion.publishedAt,
        },
        null,
        2
      )}\n</previous_published_version>`
    );
  }
  userParts.push("Draft the story JSON now.");

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userParts.join("\n\n") },
  ];
  const searchedUrls = new Set<string>();

  for (let i = 0; i <= MAX_PAUSE_RESUMES; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system,
      tools: [
        { type: "web_search_20260209", name: "web_search", max_uses: MAX_SEARCHES },
      ],
      messages,
    });

    collectSearchUrls(response.content, searchedUrls);

    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    if (response.stop_reason === "refusal") {
      throw new Error("draft declined by model safety system");
    }
    const draft = parseModelJson<DraftResult>(finalText(response.content));
    return { draft, searchedUrls };
  }
  throw new Error("draft did not complete within pause-turn budget");
}

export interface CriticVerdict {
  verdicts: { claim: string; supported: boolean; note?: string }[];
  unsupportedEssential: boolean;
  notes: string;
}

export async function criticCheck(
  draft: DraftResult,
  evidence: EvidencePackage
): Promise<CriticVerdict> {
  const webSourceList = (draft.webSources ?? [])
    .map((w) => `${w.id}: ${w.publisher} — ${w.title} (${w.url})`)
    .join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: CRITIC_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          `<draft>\n${JSON.stringify(draft, null, 2)}\n</draft>`,
          evidenceBlock(evidence),
          webSourceList
            ? `<web_sources>\n${webSourceList}\n</web_sources>`
            : "<web_sources>none</web_sources>",
          "Check every claim now.",
        ].join("\n\n"),
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    // Fail closed: treat an unchecked draft as unpublishable.
    return {
      verdicts: [],
      unsupportedEssential: true,
      notes: "critic pass declined; failing closed",
    };
  }
  return parseModelJson<CriticVerdict>(finalText(response.content));
}

// ---------------------------------------------------------------------------
// Draft → critic → gate, with one corrective regeneration (OPS 03), then
// withhold. This is the only path that produces publishable story content.
// ---------------------------------------------------------------------------

export type GatedStory =
  | {
      status: "publish";
      draft: StoryVersionDraft;
      webSources: WebSourceRef[];
      notes: string[];
    }
  | { status: "withheld"; reason: string };

export async function generateGatedStory(
  evidence: EvidencePackage,
  previousVersion: StoryVersion | null
): Promise<GatedStory> {
  let lastReason = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const { draft, searchedUrls } = await draftStory(
      evidence,
      previousVersion,
      attempt > 0 ? lastReason : undefined
    );
    if (draft.decision === "withhold") {
      return {
        status: "withheld",
        reason: draft.withholdReason || "model withheld without a reason",
      };
    }
    const critic = await criticCheck(draft, evidence);
    const gate = applyGate(draft, evidence, searchedUrls, critic);
    if (gate.ok) {
      const usedIds = new Set(
        gate.draft.claims.flatMap((c) => c.evidenceIds)
      );
      const webSources = (draft.webSources ?? []).filter(
        (w) => searchedUrls.has(w.url) && usedIds.has(w.id)
      );
      return { status: "publish", draft: gate.draft, webSources, notes: gate.notes };
    }
    lastReason = gate.reason;
    if (!gate.regenerable) break;
  }
  return { status: "withheld", reason: lastReason || "failed publication gate" };
}
