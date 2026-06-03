import type { HistoryDoc } from "./history-generate";

const SITE = "thelongview.org";
const BASE_TAGS = ["history", "markets", "founders", "investing", "signalvsnoise"];

function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}

function topicTag(topic: string): string | null {
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return slug.length >= 3 && slug.length <= 24 ? slug : null;
}

export interface ReelCaption {
  igCaption: string;
  fbDescription: string;
  hashtags: string[];
}

/**
 * Build the post copy for a Reel in the founder/investor voice: the reframed
 * headline as the hook, the significance read, the historical rhyme, and a
 * decision-relevant CTA. Same body for IG and FB; FB adds an explicit link line.
 */
export function buildCaption(doc: HistoryDoc): ReelCaption {
  const lead = doc.significance >= 7 ? "One for the timeline." : "More rhyme than rupture.";
  const pattern = doc.patterns[0];
  const proof = pattern
    ? `The rhyme: ${pattern.title}. ${clamp(pattern.description, 180)}`
    : clamp(doc.whyItMattersNow, 200);

  const hashtags = [...BASE_TAGS];
  const tag = topicTag(doc.topic);
  if (tag && !hashtags.includes(tag)) hashtags.unshift(tag);

  const body = [
    doc.truthHeadline,
    "",
    `${lead} Significance ${doc.significance}/10 — ${clamp(doc.significanceReason, 140)}`,
    "",
    proof,
    "",
    `Context for people who move on the news, not with it. The Long View → ${SITE}`,
  ].join("\n");

  const tagLine = hashtags.map((t) => `#${t}`).join(" ");
  return {
    igCaption: `${body}\n\n${tagLine}`,
    fbDescription: `${body}\n\nFull timeline → ${SITE}\n\n${tagLine}`,
    hashtags,
  };
}
