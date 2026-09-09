import type { StoryDoc } from "./story-generate";
import type { Edition, Story, StoryVersion } from "./story-types";
import {
  getCorrections,
  getEdition,
  getLatestEdition,
  getStory,
  getStoryBySlug,
  getVersion,
  getVersions,
} from "./story-store";

/**
 * Public payloads for the reading experience (PRD §12): the source and
 * correction information a reader needs, never internal notes, evidence
 * stores, numeric significance, or subscriber data. The internal score and
 * confidence reasons stay out of the default reader interface (§6).
 */

export interface PublicSource {
  publisher: string;
  title: string;
  url: string;
  sourceDate?: string;
  /** Truthful description of the material reviewed (STY 05). */
  accessLabel: "Full article" | "Article excerpt" | "Headline and summary";
}

export interface PublicCorrection {
  date: string;
  publicNote: string;
  severity: "material" | "retraction";
}

export interface PublicCard {
  slug: string;
  versionId: string;
  updateKind: "first" | "development" | "correction";
  editorialHeadline: string;
  whatChanged: string;
  whyItMatters: string;
  uncertainty?: string;
  sourceCount: number;
  publishers: string[];
  updatedAt: string;
}

export interface PublicEdition {
  id: string;
  status: Edition["status"];
  publishedAt: string;
  storyCount: number;
  readingMinutes: number;
  limitedCoverage: boolean;
  cards: PublicCard[];
}

export interface PublicStoryPage {
  slug: string;
  storyId: string;
  versionId: string;
  version: number;
  updateKind: "first" | "development" | "correction";
  isLatest: boolean;
  latestVersionId: string;
  editorialHeadline: string;
  whatChanged: string;
  changeReason?: string;
  whyItMatters: string;
  background: string;
  uncertainties: string[];
  whatToWatch?: string;
  comparison?: { name: string; similarity: string; limitation: string };
  timeline: { year: string; title: string; description: string; link: string }[];
  furtherReading: { title: string; author: string; type: string; link: string }[];
  sources: PublicSource[];
  singleOrigin?: string;
  firstPublishedAt: string;
  publishedAt: string;
  previousVersionId?: string;
  retracted: boolean;
  corrections: PublicCorrection[];
}

function accessLabel(mode?: string): PublicSource["accessLabel"] {
  if (mode === "full") return "Full article";
  if (mode === "excerpt") return "Article excerpt";
  return "Headline and summary";
}

function toPublicSources(doc: StoryDoc): PublicSource[] {
  return (doc.sources ?? []).map((s) => ({
    publisher: s.publisher,
    title: s.title,
    url: s.url,
    sourceDate: s.publishedAt,
    accessLabel: accessLabel(s.accessMode),
  }));
}

function singleOriginOf(doc: StoryDoc): string | undefined {
  const publishers = new Set((doc.sources ?? []).map((s) => s.publisher));
  return publishers.size <= 1 ? doc.sourcePublisher ?? undefined : undefined;
}

export function toPublicCard(story: Story, version: StoryVersion): PublicCard {
  const doc = version.doc;
  return {
    slug: story.slug,
    versionId: version.id,
    updateKind: version.updateKind,
    editorialHeadline: doc.truthHeadline,
    whatChanged: doc.whatChanged ?? doc.summary ?? "",
    whyItMatters: doc.whyItMattersNow ?? "",
    uncertainty: (doc.uncertainties ?? [])[0],
    sourceCount: (doc.sources ?? []).length,
    publishers: Array.from(new Set((doc.sources ?? []).map((s) => s.publisher))),
    updatedAt: version.publishedAt,
  };
}

export async function toPublicStoryPage(
  story: Story,
  version: StoryVersion
): Promise<PublicStoryPage> {
  const doc = version.doc;
  const corrections = await getCorrections(story.id);
  const affecting = corrections.filter(
    (c) =>
      c.affectedVersionIds.includes(version.id) ||
      c.replacementVersionId === version.id
  );
  return {
    slug: story.slug,
    storyId: story.id,
    versionId: version.id,
    version: version.version,
    updateKind: version.updateKind,
    isLatest: story.latestVersionId === version.id,
    latestVersionId: story.latestVersionId,
    editorialHeadline: doc.truthHeadline,
    whatChanged: doc.whatChanged ?? doc.summary ?? "",
    changeReason: version.changeReason,
    whyItMatters: doc.whyItMattersNow ?? "",
    background: doc.background ?? "",
    uncertainties: doc.uncertainties ?? [],
    whatToWatch: doc.whatToWatch || undefined,
    comparison: doc.precedent
      ? {
          name: doc.precedent.name,
          similarity: doc.precedent.similarity,
          limitation: doc.precedent.crucialDifference,
        }
      : undefined,
    timeline: doc.timeline ?? [],
    furtherReading: doc.furtherReading ?? [],
    sources: toPublicSources(doc),
    singleOrigin: singleOriginOf(doc),
    firstPublishedAt: story.firstPublishedAt,
    publishedAt: version.publishedAt,
    previousVersionId: version.predecessorId ?? undefined,
    retracted: version.retracted === true || story.status === "retracted",
    corrections: affecting.map((c) => ({
      date: c.createdAt,
      publicNote: c.publicNote,
      severity: c.severity,
    })),
  };
}

export async function getPublicEdition(
  dateId?: string
): Promise<PublicEdition | null> {
  const edition = dateId ? await getEdition(dateId) : await getLatestEdition();
  if (!edition) return null;

  const versions = await getVersions(edition.storyVersionIds);
  const cards: PublicCard[] = [];
  for (const version of versions) {
    const story = await getStory(version.storyId);
    if (!story) continue;
    cards.push(toPublicCard(story, version));
  }

  return {
    id: edition.id,
    status: edition.status,
    publishedAt: edition.publishedAt,
    storyCount: cards.length,
    readingMinutes: edition.readingMinutes,
    limitedCoverage:
      edition.status === "partial" ||
      edition.coverage.feedsSucceeded < Math.ceil(edition.coverage.feedsAttempted / 2),
    cards,
  };
}

export async function getPublicStory(
  slug: string,
  versionId?: string
): Promise<PublicStoryPage | null> {
  const story = await getStoryBySlug(slug);
  if (!story) return null;
  const version = versionId
    ? await getVersion(versionId)
    : await getVersion(story.latestVersionId);
  if (!version || version.storyId !== story.id) return null;
  return toPublicStoryPage(story, version);
}
