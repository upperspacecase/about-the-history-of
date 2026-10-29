// Ranking math for Jev triage. No network, no Firebase, no email.
//
// An independent calibration audit found Choice poorly calibrated, so the
// theme label is stored and never used as a gate or a sort key. A cluster
// reaches the Claude write-up only when worth_a_slot (Noul) clears the
// threshold. Those clusters are then ordered by importance (Score). Noul
// breaks ties inside one importance band.

export const JEV_MODEL = "jev-latest";
export const DEFAULT_NOUL_THRESHOLD = 0.55;

/** Ordered low to high. Index is the Score level (0-3). */
export const IMPORTANCE_LEVELS = [
  "Limited: a routine development with little durable effect beyond the news cycle",
  "Notable: worth knowing, but unlikely to change institutions, markets, or the historical record",
  "Consequential: a material development likely to matter for months, across people, institutions, or markets",
  "Structural: alters laws, borders, power, or systems in a way a morning briefing should not skip",
] as const;

export const THEME_LABELS = [
  "geopolitics",
  "markets",
  "tech",
  "institutions",
  "other",
] as const;

export type ThemeLabel = (typeof THEME_LABELS)[number];

export interface JevTriageDecision {
  worthNoul: number;
  importanceScore: number;
  importanceConfidence: number | null;
  theme: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface ClusterTriageInput {
  title: string;
  publishers: string[];
  /** Short "Publisher: headline" lines. Not full article text. */
  snippets: string[];
  previousAccount?: {
    editorialHeadline: string;
    whatChanged: string;
    publishedAt: string;
  } | null;
}

export interface JevState {
  title: string;
  publishers: string[];
  snippets: string[];
  previousPublishedAccount: {
    headline: string;
    whatChanged: string;
    publishedAt: string;
  } | null;
}

const MAX_SNIPPETS = 8;
const MAX_SNIPPET_CHARS = 240;

/** Titles and publishers only, capped so a triage call stays small. */
export function buildJevState(input: ClusterTriageInput): JevState {
  const snippets = input.snippets
    .map((s) => s.replace(/\s+/g, " ").trim().slice(0, MAX_SNIPPET_CHARS))
    .filter(Boolean)
    .slice(0, MAX_SNIPPETS);
  const previous = input.previousAccount;
  return {
    title: input.title.replace(/\s+/g, " ").trim().slice(0, 300),
    publishers: input.publishers
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 8),
    snippets,
    previousPublishedAccount: previous
      ? {
          headline: previous.editorialHeadline.slice(0, 300),
          whatChanged: previous.whatChanged.slice(0, 400),
          publishedAt: previous.publishedAt,
        }
      : null,
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Map a Jev decision onto the 0-10 sort key the edition already uses.
 * Importance (0-3) fills 0-10. Noul adds less than 0.1, so it only breaks ties.
 * Theme is not included.
 */
export function jevSignificance(
  decision: Pick<JevTriageDecision, "worthNoul" | "importanceScore">
): number {
  const importance = clamp(decision.importanceScore, 0, 3);
  const noul = clamp(decision.worthNoul, 0, 1);
  return (importance / 3) * 10 + noul / 100;
}

export function jevGatePassed(
  decision: Pick<JevTriageDecision, "worthNoul">,
  threshold = DEFAULT_NOUL_THRESHOLD
): boolean {
  return decision.worthNoul >= threshold;
}

export function formatJevReason(
  decision: Pick<JevTriageDecision, "worthNoul" | "importanceScore" | "theme">,
  threshold: number,
  passed: boolean
): string {
  const noul = decision.worthNoul.toFixed(3);
  const importance = decision.importanceScore.toFixed(2);
  const theme = decision.theme || "other";
  if (passed) {
    return `jev candidate: noul ${noul}, importance ${importance}, theme ${theme} (theme logged only)`;
  }
  return `jev gate: noul ${noul} below ${threshold.toFixed(2)}; importance ${importance}; theme ${theme} (theme logged only)`;
}

export interface RankedCandidate {
  id: string;
  selected: boolean;
  passed: boolean;
  /** Higher is better. Use jevSignificance. */
  rankScore: number;
  significance?: number;
  importanceScore?: number;
}

/** Passers first, then by rank score. Non-passers are not retrieved. */
export function retrievedIds(
  candidates: RankedCandidate[],
  k: number
): Set<string> {
  const passers = candidates
    .filter((c) => c.passed)
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, Math.max(0, k));
  return new Set(passers.map((c) => c.id));
}

/**
 * Fraction of stories that were actually published which Jev would still
 * have sent to the write-up inside the top K. Quiet editions (nothing
 * selected) return null and should be left out of the mean.
 */
export function recallAtK(
  candidates: RankedCandidate[],
  k: number
): number | null {
  const selected = candidates.filter((c) => c.selected);
  if (selected.length === 0) return null;
  const top = retrievedIds(candidates, k);
  const hits = selected.filter((s) => top.has(s.id)).length;
  return hits / selected.length;
}

export function meanRecall(
  perEdition: Array<number | null>
): { mean: number; days: number } {
  const scored = perEdition.filter((n): n is number => n !== null);
  if (scored.length === 0) return { mean: 0, days: 0 };
  const sum = scored.reduce((a, b) => a + b, 0);
  return { mean: sum / scored.length, days: scored.length };
}

function averageRanks(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(values.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j++;
    const rank = (i + 1 + (j + 1)) / 2;
    for (let k = i; k <= j; k++) ranks[indexed[k].i] = rank;
    i = j + 1;
  }
  return ranks;
}

/** Spearman correlation. Null when there are fewer than 3 pairs or no variance. */
export function spearman(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 3) return null;
  const rx = averageRanks(xs);
  const ry = averageRanks(ys);
  const n = xs.length;
  const mean = (n + 1) / 2;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = rx[i] - mean;
    const b = ry[i] - mean;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}
