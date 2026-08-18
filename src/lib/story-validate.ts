import { breakdownMatchesScore } from "./significance";
import type { HistoryResponse } from "./history-types";

/**
 * Deterministic whole-story checks. These run before the automated critic;
 * anything failing here never reaches publication. Semantic checks (claim
 * grounding, precedent comparability, exaggerated certainty) belong to the
 * critic call.
 */

export type StoryFailureCode =
  | "missing-verdict-headline"
  | "score-breakdown-invalid"
  | "missing-precedent"
  | "generic-precedent"
  | "vague-crucial-difference"
  | "missing-what-would-change"
  | "missing-sources"
  | "missing-explanation";

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
      detail: "the story has no Long View verdict headline",
    });
  }

  if (!breakdownMatchesScore(story.scoreBreakdown, story.significance)) {
    failures.push({
      code: "score-breakdown-invalid",
      detail:
        "the five components must each be 0-2 and add up to the displayed score",
    });
  }

  const precedentName = story.precedent?.name?.trim() ?? "";
  if (!precedentName) {
    failures.push({
      code: "missing-precedent",
      detail: "every comparison must name a specific precedent",
    });
  } else if (
    GENERIC_PRECEDENTS.some((p) => p.test(precedentName)) ||
    precedentName.length < 4
  ) {
    failures.push({
      code: "generic-precedent",
      detail: `"${precedentName}" is not a specific precedent`,
    });
  }

  const difference = story.precedent?.crucialDifference?.trim() ?? "";
  if (difference.length < 30) {
    failures.push({
      code: "vague-crucial-difference",
      detail: "the crucial difference must be concrete, not a stub",
    });
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
