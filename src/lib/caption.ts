import type { HistoryDoc } from "./history-generate";
import { significanceLabel } from "./significance";

const SITE = "thelongview.org";
const BASE_TAGS = ["history", "news", "context", "signalvsnoise"];

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
 * Build the post copy for a Reel: the verdict headline as the hook, the
 * provisional significance read, the precedent, and a CTA. Same body for IG
 * and FB; FB adds an explicit link line. Never uses en or em dashes, and
 * never uses the banned headline language.
 */
export function buildCaption(doc: HistoryDoc): ReelCaption {
  const label = significanceLabel(doc.significance);
  const precedent = doc.precedent;
  const proof = precedent
    ? `Closest precedent: ${precedent.name}. The crucial difference: ${clamp(precedent.crucialDifference, 160)}`
    : clamp(doc.whyItMattersNow, 200);

  const hashtags = [...BASE_TAGS];
  const tag = topicTag(doc.topic);
  if (tag && !hashtags.includes(tag)) hashtags.unshift(tag);

  const body = [
    doc.truthHeadline,
    "",
    `${label}. Provisional significance ${doc.significance}/10. ${clamp(doc.significanceReason, 140)}`,
    "",
    proof,
    "",
    `Know what changed. Ignore what didn't. The Long View: ${SITE}`,
  ].join("\n");

  const tagLine = hashtags.map((t) => `#${t}`).join(" ");
  return {
    igCaption: `${body}\n\n${tagLine}`,
    fbDescription: `${body}\n\nFull analysis: ${SITE}\n\n${tagLine}`,
    hashtags,
  };
}
