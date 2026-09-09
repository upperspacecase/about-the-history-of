import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./firebase/admin";
import { significantWords } from "./banned-language";
import { headlineKey } from "./history-key";
import type { StoryDoc } from "./story-generate";
import type { ResearchSource } from "./research";
import type { Headline } from "./feeds";
import type {
  CorrectionRecord,
  Edition,
  EditionStatus,
  Story,
  StoryVersion,
} from "./story-types";

/**
 * Canonical story identity and version storage (PRD v2 §8). Stories are
 * long-lived records of an underlying situation; each publication is an
 * immutable version. Editions reference version ids and never change after
 * publication (BRF 05); corrections attach new versions plus visible
 * correction records.
 */

const MATCH_WINDOW_DAYS = 45;

export function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/^-|-$/g, "");
  return base || "story";
}

export function buildSearchTokens(parts: string[]): string[] {
  const tokens = new Set<string>();
  for (const part of parts) {
    for (const w of significantWords(part ?? "")) {
      if (w.length >= 3) tokens.add(w);
    }
  }
  return Array.from(tokens).slice(0, 60);
}

// ---------------------------------------------------------------------------
// Matching (PRD §8): entity and word overlap against recent stories. This is
// deliberately conservative: a low-confidence match stays a separate story
// until evidence supports a merge, which is the PRD's required behaviour.
// ---------------------------------------------------------------------------

export interface StoryMatch {
  story: Story;
  latestVersion: StoryVersion;
  score: number;
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared += 1;
  return shared / Math.min(a.size, b.size);
}

export async function findMatchingStory(
  cluster: Headline[]
): Promise<StoryMatch | null> {
  const db = getAdminDb();
  const clusterWords = new Set(
    cluster.flatMap((m) => significantWords(m.title))
  );
  if (clusterWords.size === 0) return null;

  const cutoff = new Date(
    Date.now() - MATCH_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  // array-contains-any accepts at most 10 values; use the most distinctive
  // (longest) cluster words as probes.
  const probes = Array.from(clusterWords)
    .sort((a, b) => b.length - a.length)
    .slice(0, 10);

  const snap = await db
    .collection("stories")
    .where("searchTokens", "array-contains-any", probes)
    .where("latestUpdateAt", ">=", cutoff)
    .limit(25)
    .get();

  let best: StoryMatch | null = null;
  for (const docSnap of snap.docs) {
    const story = docSnap.data() as Story;
    if (story.status === "retracted") continue;

    const storyWords = new Set([
      ...story.searchTokens,
      ...story.entities.flatMap((e) => significantWords(e)),
    ]);
    const score = overlap(clusterWords, storyWords);

    // Threshold: strong lexical agreement plus at least one entity word in
    // common. Below it, the cluster becomes a new story rather than a risky
    // merge (PRD: treat a shared name as a candidate match, not proof).
    const entityWords = new Set(
      story.entities.flatMap((e) => significantWords(e))
    );
    const sharesEntity = [...clusterWords].some((w) => entityWords.has(w));
    if (score >= 0.5 && sharesEntity) {
      if (!best || score > best.score) {
        const latest = await getVersion(story.latestVersionId);
        if (latest) best = { story, latestVersion: latest, score };
      }
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getStory(storyId: string): Promise<Story | null> {
  const snap = await getAdminDb().collection("stories").doc(storyId).get();
  return snap.exists ? (snap.data() as Story) : null;
}

export async function getStoryBySlug(slug: string): Promise<Story | null> {
  const snap = await getAdminDb()
    .collection("stories")
    .where("slug", "==", slug)
    .limit(1)
    .get();
  return snap.empty ? null : (snap.docs[0].data() as Story);
}

export async function getVersion(
  versionId: string
): Promise<StoryVersion | null> {
  const snap = await getAdminDb()
    .collection("storyVersions")
    .doc(versionId)
    .get();
  return snap.exists ? (snap.data() as StoryVersion) : null;
}

export async function getVersions(
  versionIds: string[]
): Promise<StoryVersion[]> {
  if (versionIds.length === 0) return [];
  const db = getAdminDb();
  const snaps = await db.getAll(
    ...versionIds.map((id) => db.collection("storyVersions").doc(id))
  );
  return snaps
    .filter((s) => s.exists)
    .map((s) => s.data() as StoryVersion);
}

export async function getEdition(dateId: string): Promise<Edition | null> {
  const snap = await getAdminDb().collection("editions").doc(dateId).get();
  return snap.exists ? (snap.data() as Edition) : null;
}

export async function getLatestEdition(): Promise<Edition | null> {
  const snap = await getAdminDb()
    .collection("editions")
    .orderBy("publishedAt", "desc")
    .limit(1)
    .get();
  return snap.empty ? null : (snap.docs[0].data() as Edition);
}

export async function getCorrections(
  storyId: string
): Promise<CorrectionRecord[]> {
  const snap = await getAdminDb()
    .collection("corrections")
    .where("storyId", "==", storyId)
    .get();
  return snap.docs
    .map((d) => d.data() as CorrectionRecord)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface PublishInput {
  doc: StoryDoc;
  researchSources: ResearchSource[];
  /** Set when the story updates an existing one. */
  existing?: { story: Story; latestVersion: StoryVersion } | null;
  changeReason?: string;
  entities: string[];
  topics: string[];
  /** Titles of the cluster reports, for the legacy-history mapping. */
  clusterTitles: string[];
}

export interface PublishedRef {
  story: Story;
  version: StoryVersion;
}

async function uniqueSlug(base: string): Promise<string> {
  const db = getAdminDb();
  let slug = base;
  for (let i = 2; i < 20; i++) {
    const clash = await db
      .collection("stories")
      .where("slug", "==", slug)
      .limit(1)
      .get();
    if (clash.empty) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * Write one story version (and its story record) durably. Editions are
 * published separately AFTER every referenced version exists (OPS 01).
 */
export async function publishStoryVersion(
  input: PublishInput
): Promise<PublishedRef> {
  const db = getAdminDb();
  const now = new Date().toISOString();
  const { doc } = input;

  let story: Story;
  let version: StoryVersion;

  if (input.existing) {
    const prev = input.existing;
    const versionNumber = prev.story.versionCount + 1;
    version = {
      id: `${prev.story.id}-v${versionNumber}`,
      storyId: prev.story.id,
      version: versionNumber,
      predecessorId: prev.latestVersion.id,
      updateKind: "development",
      comparedWithVersionId: prev.latestVersion.id,
      changeReason: input.changeReason,
      doc,
      researchSources: input.researchSources,
      publishedAt: now,
      schemaVersion: 1,
    };
    story = {
      ...prev.story,
      scope: doc.summary ?? prev.story.scope,
      entities: Array.from(
        new Set([...prev.story.entities, ...input.entities])
      ).slice(0, 16),
      topics: Array.from(new Set([...prev.story.topics, ...input.topics])).slice(0, 8),
      searchTokens: buildSearchTokens([
        prev.story.searchTokens.join(" "),
        doc.truthHeadline,
        doc.sourceHeadline ?? "",
        input.entities.join(" "),
      ]),
      latestVersionId: version.id,
      latestUpdateAt: now,
      versionCount: versionNumber,
    };
  } else {
    const storyRef = db.collection("stories").doc();
    const slug = await uniqueSlug(slugify(doc.truthHeadline));
    version = {
      id: `${storyRef.id}-v1`,
      storyId: storyRef.id,
      version: 1,
      predecessorId: null,
      updateKind: "first",
      doc,
      researchSources: input.researchSources,
      publishedAt: now,
      schemaVersion: 1,
    };
    story = {
      id: storyRef.id,
      slug,
      scope: doc.summary ?? doc.truthHeadline,
      entities: input.entities.slice(0, 16),
      topics: input.topics.slice(0, 8),
      searchTokens: buildSearchTokens([
        doc.truthHeadline,
        doc.sourceHeadline ?? "",
        doc.topic ?? "",
        input.entities.join(" "),
        input.topics.join(" "),
      ]),
      firstPublishedAt: now,
      latestVersionId: version.id,
      latestUpdateAt: now,
      versionCount: 1,
      relatedStoryIds: [],
      legacyHistoryIds: [],
      status: "active",
    };
  }

  // Legacy mapping (AT 19): link any old headline-keyed history for the
  // cluster's titles to this canonical story.
  const legacyIds: string[] = [];
  for (const title of input.clusterTitles.slice(0, 10)) {
    const legacyId = headlineKey(title);
    const legacySnap = await db.collection("histories").doc(legacyId).get();
    if (legacySnap.exists) legacyIds.push(legacyId);
  }

  const batch = db.batch();
  batch.set(db.collection("storyVersions").doc(version.id), version);
  batch.set(db.collection("stories").doc(story.id), {
    ...story,
    legacyHistoryIds: Array.from(
      new Set([...story.legacyHistoryIds, ...legacyIds])
    ),
  });
  for (const legacyId of legacyIds) {
    batch.set(
      db.collection("histories").doc(legacyId),
      { storyId: story.id },
      { merge: true }
    );
  }
  await batch.commit();

  return { story, version };
}

export interface EditionInput {
  dateId: string; // YYYY-MM-DD UTC
  status: EditionStatus;
  storyVersionIds: string[];
  coverage: Edition["coverage"];
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function editionWordCount(versions: StoryVersion[]): number {
  // Core briefing text only (BRF 01): headline, what changed, why it
  // matters. Background, sources, and navigation are excluded.
  let words = 0;
  for (const v of versions) {
    words += countWords(v.doc.truthHeadline);
    words += countWords(v.doc.whatChanged ?? "");
    words += countWords(v.doc.whyItMattersNow ?? "");
  }
  return words;
}

export function readingMinutes(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 220));
}

/**
 * Publish the edition record. Referenced versions must already exist; the
 * single edition-document write is the atomic publication point (OPS 01).
 * Re-publishing an existing edition id is refused (OPS 02).
 */
export async function publishEdition(input: EditionInput): Promise<Edition> {
  const db = getAdminDb();
  const ref = db.collection("editions").doc(input.dateId);
  const existing = await ref.get();
  if (existing.exists) {
    throw new Error(
      `edition ${input.dateId} already exists; re-runs must not replace it silently`
    );
  }

  const versions = await getVersions(input.storyVersionIds);
  if (versions.length !== input.storyVersionIds.length) {
    throw new Error(
      `edition ${input.dateId} references missing story versions; refusing to publish`
    );
  }

  const wordCount = editionWordCount(versions);
  const edition: Edition = {
    id: input.dateId,
    timeZone: "UTC",
    status: input.status,
    storyVersionIds: input.storyVersionIds,
    publishedAt: new Date().toISOString(),
    coverage: input.coverage,
    wordCount,
    readingMinutes: readingMinutes(wordCount),
  };
  await ref.set(edition);
  return edition;
}

// ---------------------------------------------------------------------------
// Corrections and retractions (STY 06, §8 version semantics)
// ---------------------------------------------------------------------------

export async function recordCorrection(options: {
  story: Story;
  affectedVersionIds: string[];
  replacementDoc: StoryDoc | null; // null = retraction
  researchSources: ResearchSource[];
  reason: string;
  publicNote: string;
}): Promise<CorrectionRecord> {
  const db = getAdminDb();
  const now = new Date().toISOString();
  const correctionRef = db.collection("corrections").doc();

  let replacementVersionId: string | null = null;
  const batch = db.batch();

  if (options.replacementDoc) {
    const versionNumber = options.story.versionCount + 1;
    const version: StoryVersion = {
      id: `${options.story.id}-v${versionNumber}`,
      storyId: options.story.id,
      version: versionNumber,
      predecessorId: options.story.latestVersionId,
      updateKind: "correction",
      comparedWithVersionId: options.story.latestVersionId,
      changeReason: options.reason,
      doc: options.replacementDoc,
      researchSources: options.researchSources,
      publishedAt: now,
      schemaVersion: 1,
    };
    replacementVersionId = version.id;
    batch.set(db.collection("storyVersions").doc(version.id), version);
    batch.set(
      db.collection("stories").doc(options.story.id),
      {
        latestVersionId: version.id,
        latestUpdateAt: now,
        versionCount: versionNumber,
      },
      { merge: true }
    );
  } else {
    batch.set(
      db.collection("stories").doc(options.story.id),
      { status: "retracted", latestUpdateAt: now },
      { merge: true }
    );
  }

  const record: CorrectionRecord = {
    id: correctionRef.id,
    storyId: options.story.id,
    affectedVersionIds: options.affectedVersionIds,
    replacementVersionId,
    reason: options.reason,
    publicNote: options.publicNote,
    severity: options.replacementDoc ? "material" : "retraction",
    createdAt: now,
  };
  batch.set(correctionRef, record);

  for (const versionId of options.affectedVersionIds) {
    const patch: Record<string, unknown> = {
      correctionIds: FieldValue.arrayUnion(record.id),
    };
    if (!options.replacementDoc) patch.retracted = true;
    batch.set(db.collection("storyVersions").doc(versionId), patch, {
      merge: true,
    });
  }

  await batch.commit();
  return record;
}
