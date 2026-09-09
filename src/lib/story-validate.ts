import { breakdownMatchesScore } from "./significance";
import type { HistoryResponse } from "./history-types";

/**
 * Deterministic whole-story checks. These run before the automated critic;
 * anything failing here never reaches publication. Semantic checks (claim
 * grounding, precedent comparability, exaggerated certainty) belong to the
 * critic call.
 *
 * PRD v2: a precedent, timeline, or patterns section is OPTIONAL. A missing
 * comparison is a valid outcome; only a present-but-vague one fails.
 */

export type StoryFailureCode =
  | "missing-verdict-headline"
  | "score-breakdown-invalid"
  | "generic-precedent"
  | "vague-crucial-difference"
  | "missing-what-would-change"
  | "missing-sources"
  | "missing-explanation"
  | "missing-what-changed"
  | "missing-background"
  | "missing-uncertainties";

export interface StoryFailure {
  code: StoryFailureCode;
  detail: string;
}

const GENERIC_PRECEDENTS = [
  /^history$/i,
  /^the past$/i,
  /^previous (events|crises|episodes)$/i,
  /^earlier (times|eras)$/i,
  /^many times before$/i,
  /^similar events$/i,
];

export function validateStory(
  story: Partial<HistoryResponse>
): StoryFailure[] {
  const failures: StoryFailure[] = [];

  if (!story.truthHeadline?.trim()) {
    failures.push({
      code: "missing-verdict-headline",
      detail: "the story has no editorial headline",
    });
  }

  if (!breakdownMatchesScore(story.scoreBreakdown, story.significance)) {
    failures.push({
      code: "score-breakdown-invalid",
      detail:
        "the five components must each be 0-2 and add up to the internal score",
    });
  }

  if (!story.whatChanged?.trim()) {
    failures.push({
      code: "missing-what-changed",
      detail: "the story must state the concrete development",
    });
  }

  if (!story.background?.trim()) {
    failures.push({
      code: "missing-background",
      detail: "the story must explain how we got here",
    });
  }

  // Uncertainty is stated per story unless the event is settled AND the
  // reporting is not rapidly developing; an empty list plus a rapidly
  // developing flag is a contradiction.
  if (!Array.isArray(story.uncertainties)) {
    failures.push({
      code: "missing-uncertainties",
      detail: "uncertainties must be present (an empty list only for settled stories)",
    });
  }

  // Precedent is optional; when present it must be specific.
  if (story.precedent) {
    const precedentName = story.precedent.name?.trim() ?? "";
    if (
      !precedentName ||
      GENERIC_PRECEDENTS.some((p) => p.test(precedentName)) ||
      precedentName.length < 4
    ) {
      failures.push({
        code: "generic-precedent",
        detail: `"${precedentName}" is not a specific precedent`,
      });
    }
    const difference = story.precedent.crucialDifference?.trim() ?? "";
    if (difference.length < 30) {
      failures.push({
        code: "vague-crucial-difference",
        detail: "the crucial difference must be concrete, not a stub",
      });
    }
  }

  if (!story.whatWouldChange?.raise?.trim() || !story.whatWouldChange?.lower?.trim()) {
    failures.push({
      code: "missing-what-would-change",
      detail: "state what future evidence would raise and lower the score",
    });
  }

  if (!story.sources || story.sources.length === 0) {
    failures.push({
      code: "missing-sources",
      detail: "every claim must be linked to supporting sources",
    });
  }

  if (!story.significanceReason?.trim()) {
    failures.push({
      code: "missing-explanation",
      detail: "the one-sentence explanation of the score is missing",
    });
  }

  return failures;
}
