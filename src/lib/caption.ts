import type { StoryDoc as HistoryDoc } from "./story-generate";

const SITE = "thelongview.org";
const BASE_TAGS = ["news", "context", "explained"];

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
 * Post copy for a Reel (§10 social template): the editorial headline, a
 * brief explanation of the development and why it matters, the material
 * uncertainty when present, source attribution, and the site reference. No
 * suspense endings, no claims about what the media is hiding, no crossed-out
 * source framing, and essential qualifications kept (EVD 10).
 */
export function buildCaption(
  doc: HistoryDoc,
  storyPath?: string
): ReelCaption {
  const hashtags = [...BASE_TAGS];
  const tag = topicTag(doc.topic ?? "");
  if (tag && !hashtags.includes(tag)) hashtags.unshift(tag);

  const sourceLine = (doc.sources ?? [])
    .slice(0, 2)
    .map((s) => `${s.publisher}, ${clamp(s.title, 70)}`)
    .join("; ");

  const uncertainty = (doc.uncertainties ?? [])[0];

  const lines = [
    doc.truthHeadline,
    "",
    clamp(doc.whatChanged ?? doc.summary ?? "", 320),
    clamp(doc.whyItMattersNow ?? "", 240),
  ];
  if (uncertainty) {
    lines.push("", clamp(uncertainty, 180));
  }
  if (sourceLine) {
    lines.push("", `Sources: ${sourceLine}.`);
  }
  lines.push(
    "",
    `Read the explanation and sources at ${SITE}${storyPath ? `. ${SITE}${storyPath}` : "."}`
  );

  const body = lines.join("\n");
  const tagLine = hashtags.map((t) => `#${t}`).join(" ");
  return {
    igCaption: `${body}\n\n${tagLine}`,
    fbDescription: `${body}\n\n${tagLine}`,
    hashtags,
  };
}
