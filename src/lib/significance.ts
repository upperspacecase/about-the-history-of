import type { ScoreBreakdown } from "./history-types";

/**
 * Significance scoring: five dimensions, each 0-2 points, summing to the
 * displayed 0-10 score. The score is always provisional. A live system
 * cannot know an event's final historical significance.
 */

export const SCORE_DIMENSIONS: {
  key: keyof ScoreBreakdown;
  label: string;
  question: string;
}[] = [
  {
    key: "scale",
    label: "Scale",
    question:
      "How many people, institutions, countries, or markets could be affected?",
  },
  {
    key: "durability",
    label: "Durability",
    question: "How long are the effects likely to last?",
  },
  {
    key: "institutionalChange",
    label: "Institutional change",
    question:
      "Does it alter laws, systems, borders, organisations, or power structures?",
  },
  {
    key: "novelty",
    label: "Novelty",
    question:
      "Is something genuinely changing, or is this another instance of an established pattern?",
  },
  {
    key: "spillovers",
    label: "Spillovers",
    question:
      "Could it materially affect other sectors, countries, or future events?",
  },
];

export function significanceLabel(score: number): string {
  if (score <= 2) return "Limited wider significance";
  if (score <= 4) return "Notable";
  if (score <= 6) return "Consequential";
  if (score <= 8) return "Structural shift";
  return "Era-defining";
}

function clampComponent(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.min(2, Math.max(0, n));
}

/**
 * Normalise a model-produced breakdown so every component is an integer in
 * 0-2 and return the total. The total IS the displayed score; nothing else
 * may set it.
 */
export function normalizeBreakdown(raw: Partial<ScoreBreakdown> | undefined): {
  breakdown: ScoreBreakdown;
  total: number;
} {
  const breakdown: ScoreBreakdown = {
    scale: clampComponent(raw?.scale),
    durability: clampComponent(raw?.durability),
    institutionalChange: clampComponent(raw?.institutionalChange),
    novelty: clampComponent(raw?.novelty),
    spillovers: clampComponent(raw?.spillovers),
  };
  const total =
    breakdown.scale +
    breakdown.durability +
    breakdown.institutionalChange +
    breakdown.novelty +
    breakdown.spillovers;
  return { breakdown, total };
}

/** True when every component is a 0-2 integer and the sum equals `score`. */
export function breakdownMatchesScore(
  breakdown: ScoreBreakdown | undefined,
  score: number | undefined
): boolean {
  if (!breakdown || typeof score !== "number") return false;
  const parts = [
    breakdown.scale,
    breakdown.durability,
    breakdown.institutionalChange,
    breakdown.novelty,
    breakdown.spillovers,
  ];
  if (parts.some((p) => !Number.isInteger(p) || p < 0 || p > 2)) return false;
  return parts.reduce((a, b) => a + b, 0) === score;
}
