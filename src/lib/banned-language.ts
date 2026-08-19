/**
 * Banned headline language, plus automatic detection of newly overused words
 * and constructions. There is no human editorial queue, so the effective ban
 * list must grow on its own: anything trending toward cliche in the recent
 * published headlines is banned for new candidates.
 */

/**
 * Statically banned phrases. A candidate containing any of these is rejected
 * unless the story names a specific and directly relevant precedent (the
 * validator receives that flag from the analysis).
 */
export const BANNED_PHRASES: string[] = [
  "echoes",
  "after decades of",
  "century-old",
  "marks",
  "signals",
  "highlights",
  "reflects",
  "underscores",
  "reshapes",
  "familiar pattern",
  "as old as",
  "one for the timeline",
  "more rhyme than rupture",
];

const WORD_BOUNDARY_SAFE = /^[a-z0-9 -]+$/i;

function phraseRegex(phrase: string): RegExp {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (WORD_BOUNDARY_SAFE.test(phrase)) {
    return new RegExp(`\\b${escaped}\\b`, "i");
  }
  return new RegExp(escaped, "i");
}

/** All banned phrases (static plus dynamic) found in the text. */
export function findBannedPhrases(
  text: string,
  dynamicBans: string[] = []
): string[] {
  const found: string[] = [];
  for (const phrase of [...BANNED_PHRASES, ...dynamicBans]) {
    if (phraseRegex(phrase).test(text)) found.push(phrase);
  }
  return found;
}

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "for",
  "with", "at", "by", "from", "as", "is", "are", "was", "were", "be",
  "has", "have", "had", "it", "its", "this", "that", "these", "those",
  "not", "no", "than", "more", "less", "still", "now", "just", "what",
  "how", "why", "who", "when", "will", "would", "could", "can", "may",
  "one", "two", "new", "old", "big", "us", "up", "out", "into", "over",
]);

export function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

export interface OverusedLanguage {
  /** Content words appearing in too many recent headlines. */
  words: string[];
  /** Two-word phrases appearing in too many recent headlines. */
  bigrams: string[];
}

/**
 * Detect words and phrases becoming overused across the recent published
 * headlines. The returned language is treated as banned for new candidates,
 * expanding the static list automatically.
 */
export function detectOverusedLanguage(
  recentHeadlines: string[],
  options: { wordThreshold?: number; bigramThreshold?: number } = {}
): OverusedLanguage {
  const wordThreshold =
    options.wordThreshold ??
    Math.max(4, Math.ceil(recentHeadlines.length * 0.12));
  const bigramThreshold = options.bigramThreshold ?? 3;

  const wordCounts = new Map<string, number>();
  const bigramCounts = new Map<string, number>();

  for (const headline of recentHeadlines) {
    const words = significantWords(headline);
    for (const w of new Set(words)) {
      wordCounts.set(w, (wordCounts.get(w) ?? 0) + 1);
    }
    const raw = headline
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    const seen = new Set<string>();
    for (let i = 0; i < raw.length - 1; i++) {
      if (STOP_WORDS.has(raw[i]) && STOP_WORDS.has(raw[i + 1])) continue;
      seen.add(`${raw[i]} ${raw[i + 1]}`);
    }
    for (const b of seen) {
      bigramCounts.set(b, (bigramCounts.get(b) ?? 0) + 1);
    }
  }

  const words = [...wordCounts.entries()]
    .filter(([, count]) => count >= wordThreshold)
    .map(([w]) => w);
  const bigrams = [...bigramCounts.entries()]
    .filter(([, count]) => count >= bigramThreshold)
    .map(([b]) => b);

  return { words, bigrams };
}

/**
 * A structural construction signature: function words and punctuation are
 * kept, content words are blanked. "Mostly rotation, not escalation" and
 * "Mostly theatre, not policy" share the signature "mostly _, not _". Used
 * to enforce that no construction appears more than twice within the
 * previous thirty stories.
 */
export function constructionSignature(headline: string): string {
  const raw = headline.toLowerCase().replace(/[^a-z0-9\s,:'-]/g, " ");
  const tokens = raw.split(/\s+/).filter(Boolean);
  return tokens
    .map((token) => {
      const punctuation = token.endsWith(",")
        ? ","
        : token.endsWith(":")
          ? ":"
          : "";
      const word = token.replace(/[,:]+$/, "");
      const keep = STOP_WORDS.has(word) || word.length <= 3;
      return (keep ? word : "_") + punctuation;
    })
    .join(" ");
}
