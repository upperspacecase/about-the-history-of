import {
  constructionSignature,
  findBannedPhrases,
  significantWords,
} from "./banned-language";

/**
 * Deterministic headline checks. Every rejection carries a specific failure
 * code so the generator can try again; nothing here rewrites the candidate.
 * Semantic checks (unsupported claims, invented entities, meaning mismatch)
 * belong to the automated critic, not this module.
 */

export type HeadlineFailureCode =
  | "too-few-words"
  | "too-many-words"
  | "too-many-characters"
  | "not-sentence-case"
  | "banned-language"
  | "vague-historical-language"
  | "em-dash"
  | "paraphrases-source"
  | "too-similar-to-recent"
  | "repeated-construction";

export interface HeadlineFailure {
  code: HeadlineFailureCode;
  detail: string;
}

export interface HeadlineValidationContext {
  sourceHeadline: string;
  /** Recent published Long View headlines, most recent first. */
  recentHeadlines: string[];
  /** Automatically detected overused words and phrases (extra bans). */
  dynamicBans?: string[];
  /**
   * The specific precedent named by the analysis, when there is one. A
   * banned phrase is tolerated only when the headline itself names this
   * precedent.
   */
  precedentName?: string;
}

const MIN_WORDS = 3;
const MAX_WORDS = 12;
const MAX_CHARS = 80;

const VAGUE_HISTORY = [
  /\bthroughout history\b/i,
  /\bhistory (shows|tells|suggests|teaches)\b/i,
  /\btime and again\b/i,
  /\bsince time immemorial\b/i,
  /\bhistory repeats\b/i,
  /\bage-old\b/i,
];

function words(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

function overlapRatio(a: string, b: string): number {
  const aWords = new Set(significantWords(a));
  const bWords = new Set(significantWords(b));
  if (aWords.size === 0 || bWords.size === 0) return 0;
  let shared = 0;
  for (const w of aWords) if (bWords.has(w)) shared += 1;
  return shared / Math.min(aWords.size, bWords.size);
}

function looksTitleCase(headline: string): boolean {
  const parts = words(headline);
  if (parts.length < 4) return false;
  const rest = parts.slice(1).filter((w) => /^[A-Za-z]/.test(w));
  if (rest.length === 0) return false;
  const capitalised = rest.filter(
    (w) => /^[A-Z]/.test(w) && !(w === w.toUpperCase() && w.length <= 5)
  );
  return capitalised.length / rest.length >= 0.6;
}

function headlineNamesPrecedent(
  headline: string,
  precedentName: string | undefined
): boolean {
  if (!precedentName) return false;
  const nameWords = significantWords(precedentName);
  if (nameWords.length === 0) return false;
  const headlineWords = new Set(significantWords(headline));
  const matched = nameWords.filter((w) => headlineWords.has(w));
  return matched.length >= Math.min(2, nameWords.length);
}

export function validateHeadline(
  candidate: string,
  context: HeadlineValidationContext
): HeadlineFailure[] {
  const failures: HeadlineFailure[] = [];
  const headline = candidate.trim();
  const wordCount = words(headline).length;

  if (wordCount < MIN_WORDS) {
    failures.push({
      code: "too-few-words",
      detail: `${wordCount} words; minimum is ${MIN_WORDS}`,
    });
  }
  if (wordCount > MAX_WORDS) {
    failures.push({
      code: "too-many-words",
      detail: `${wordCount} words; maximum is ${MAX_WORDS}`,
    });
  }
  if (headline.length > MAX_CHARS) {
    failures.push({
      code: "too-many-characters",
      detail: `${headline.length} characters; maximum is ${MAX_CHARS}`,
    });
  }

  if (looksTitleCase(headline)) {
    failures.push({
      code: "not-sentence-case",
      detail: "headline reads as Title Case; use sentence case",
    });
  }

  if (/[–—]/.test(headline)) {
    failures.push({
      code: "em-dash",
      detail: "contains an en dash or em dash",
    });
  }

  const banned = findBannedPhrases(headline, context.dynamicBans ?? []);
  if (
    banned.length > 0 &&
    !headlineNamesPrecedent(headline, context.precedentName)
  ) {
    failures.push({
      code: "banned-language",
      detail: `banned language: ${banned.join(", ")}`,
    });
  }

  for (const pattern of VAGUE_HISTORY) {
    if (pattern.test(headline)) {
      failures.push({
        code: "vague-historical-language",
        detail: `vague historical language: ${pattern.source}`,
      });
      break;
    }
  }

  if (overlapRatio(headline, context.sourceHeadline) >= 0.6) {
    failures.push({
      code: "paraphrases-source",
      detail: "substantially paraphrases the source headline",
    });
  }

  for (const recent of context.recentHeadlines) {
    if (overlapRatio(headline, recent) >= 0.6) {
      failures.push({
        code: "too-similar-to-recent",
        detail: `too close to a recent headline: "${recent}"`,
      });
      break;
    }
  }

  const signature = constructionSignature(headline);
  const repeated = context.recentHeadlines
    .slice(0, 30)
    .filter((h) => constructionSignature(h) === signature).length;
  if (repeated >= 2) {
    failures.push({
      code: "repeated-construction",
      detail: `construction already used ${repeated} times in the last 30 stories`,
    });
  }

  return failures;
}
