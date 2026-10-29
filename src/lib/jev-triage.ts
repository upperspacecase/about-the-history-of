// One System One call per candidate cluster. Jev returns typed decisions
// (Noul, Score, Choice) and no prose. Any thrown error is the caller's
// signal to fall back to Claude triage.
import { choice, noul, score, TypeSafeClient } from "@typesafe-ai/sdk";
import type { EvidencePackage } from "./evidence";
import type { StoryGenerationInput } from "./story-generate";
import {
  IMPORTANCE_LEVELS,
  JEV_MODEL,
  THEME_LABELS,
  buildJevState,
  type ClusterTriageInput,
  type JevTriageDecision,
} from "./jev-rank";

export type { JevTriageDecision } from "./jev-rank";

const QUESTIONS = {
  worth_a_slot: noul(
    "Does this cluster deserve a slot in a three-story morning briefing for time-poor professionals who already read serious news?",
    {
      true: "A material development that belongs in today's three-story briefing. When a previous published account is present, only a development beyond that account counts: a decision taking effect, a new confirmed outcome, a substantial revision of the facts, or a credible change to the explanation.",
      false: "Routine re-reporting, reaction quotes, or the same facts repeated. Also no when a previous account is present and nothing material has changed, or when the event is too small for one of three morning slots.",
    }
  ),
  importance: score(
    "How important is this development for someone who wants to understand what changed and then get on with their day?",
    IMPORTANCE_LEVELS
  ),
  // Logged only. Choice is not used to gate or rank; an independent audit
  // found it poorly calibrated.
  historical_theme: choice("Which theme best fits this cluster?", {
    geopolitics: "Conflict, diplomacy, states, elections, or security",
    markets: "Companies, finance, trade, labour, or the economy",
    tech: "Technology, science, platforms, or infrastructure",
    institutions: "Law, courts, regulation, public health, or organisations",
    other: "Does not fit the themes above",
  }),
};

let client: TypeSafeClient | null = null;

function getClient(): TypeSafeClient {
  if (client) return client;
  client = new TypeSafeClient({
    timeout: 15_000,
    logLevel: "error",
    compression: false,
    retry: { maxRetries: 1 },
  });
  return client;
}

function finite(name: string, value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Jev ${name} was not a finite number`);
  }
  return value;
}

export function clusterInputFromEvidence(
  evidence: EvidencePackage,
  previousAccount: StoryGenerationInput["previousAccount"]
): ClusterTriageInput {
  const publishers = [
    ...new Set(evidence.sources.map((s) => s.publisher).filter(Boolean)),
  ];
  const snippets = evidence.sources
    .slice(0, 8)
    .map((s) => `${s.publisher}: ${s.title}`);
  return {
    title: evidence.sourceHeadline,
    publishers,
    snippets,
    previousAccount: previousAccount ?? null,
  };
}

/**
 * Ask Jev whether a cluster deserves a briefing slot, how important it is,
 * and which theme it sits in. Throws on missing key, timeout, HTTP error,
 * or a response that is not the three typed answers.
 */
export async function triageClusterWithJev(
  input: ClusterTriageInput
): Promise<JevTriageDecision> {
  const built = buildJevState(input);
  // A plain object: the SDK state type wants an index signature.
  const state: { [key: string]: string | string[] | null | { [key: string]: string } } =
    {
      title: built.title,
      publishers: built.publishers,
      snippets: built.snippets,
      previousPublishedAccount: built.previousPublishedAccount,
    };
  const response = await getClient().systemOne({
    model: JEV_MODEL,
    state,
    questions: QUESTIONS,
  });

  const worth = response.answers.worth_a_slot;
  const importance = response.answers.importance;
  const theme = response.answers.historical_theme;
  if (!worth || worth.type !== "noul") {
    throw new Error("Jev response missing worth_a_slot");
  }
  if (!importance || importance.type !== "score") {
    throw new Error("Jev response missing importance");
  }
  if (!theme || theme.type !== "choice") {
    throw new Error("Jev response missing historical_theme");
  }

  const themeLabel = String(theme.choice);
  if (!THEME_LABELS.includes(themeLabel as (typeof THEME_LABELS)[number])) {
    throw new Error(`Jev theme was not one of the expected labels`);
  }

  return {
    worthNoul: finite("worth_a_slot", worth.noul),
    importanceScore: finite("importance", importance.score),
    importanceConfidence:
      typeof importance.confidence === "number" &&
      Number.isFinite(importance.confidence)
        ? importance.confidence
        : null,
    theme: themeLabel,
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

/** Strip credential-shaped fragments before a fallback is logged. */
export function redactError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg
    .replace(/-----BEGIN[\s\S]*?-----END[^\n]*-----/g, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .slice(0, 240);
}
