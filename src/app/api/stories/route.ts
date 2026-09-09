import { getAdminDb } from "@/lib/firebase/admin";
import { significantWords } from "@/lib/banned-language";
import type { Story } from "@/lib/story-types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface StoryResult {
  slug: string;
  headline: string;
  scope: string;
  topics: string[];
  firstPublishedAt: string;
  latestUpdateAt: string;
}

// Paginated public search over published stories (ARC 01). Date filters
// refer to the most recent update. Bounded: at most 100 candidate documents
// are read per request; results never include internal fields.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 200);
  const topic = (url.searchParams.get("topic") ?? "").toLowerCase().slice(0, 40);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const cursor = url.searchParams.get("cursor") ?? "";

  for (const d of [from, to]) {
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      return Response.json({ error: "invalid date filter" }, { status: 400 });
    }
  }

  const db = getAdminDb();
  const tokens = significantWords(q).filter((w) => w.length >= 3);

  let candidates: Story[];
  if (tokens.length > 0) {
    const snap = await db
      .collection("stories")
      .where("searchTokens", "array-contains-any", tokens.slice(0, 10))
      .limit(100)
      .get();
    candidates = snap.docs.map((d) => d.data() as Story);
    // Rank: stories matching more query tokens first, then most recent.
    candidates.sort((a, b) => {
      const aTokens = new Set(a.searchTokens);
      const bTokens = new Set(b.searchTokens);
      const aHits = tokens.filter((t) => aTokens.has(t)).length;
      const bHits = tokens.filter((t) => bTokens.has(t)).length;
      if (aHits !== bHits) return bHits - aHits;
      return b.latestUpdateAt.localeCompare(a.latestUpdateAt);
    });
  } else {
    const snap = await db
      .collection("stories")
      .orderBy("latestUpdateAt", "desc")
      .limit(100)
      .get();
    candidates = snap.docs.map((d) => d.data() as Story);
  }

  const filtered = candidates.filter((s) => {
    if (s.status === "retracted") return false;
    if (topic && !s.topics.includes(topic)) return false;
    if (from && s.latestUpdateAt < `${from}T00:00:00`) return false;
    if (to && s.latestUpdateAt > `${to}T23:59:59`) return false;
    return true;
  });

  const offset = Math.max(0, parseInt(cursor, 10) || 0);
  const page = filtered.slice(offset, offset + PAGE_SIZE);
  const versionIds = page.map((s) => s.latestVersionId);
  const versionSnaps = versionIds.length
    ? await db.getAll(
        ...versionIds.map((id) => db.collection("storyVersions").doc(id))
      )
    : [];
  const headlineByStory = new Map<string, string>();
  for (const snap of versionSnaps) {
    if (!snap.exists) continue;
    const v = snap.data() as { storyId: string; doc: { truthHeadline: string } };
    headlineByStory.set(v.storyId, v.doc.truthHeadline);
  }

  const results: StoryResult[] = page.map((s) => ({
    slug: s.slug,
    headline: headlineByStory.get(s.id) ?? s.scope,
    scope: s.scope,
    topics: s.topics,
    firstPublishedAt: s.firstPublishedAt,
    latestUpdateAt: s.latestUpdateAt,
  }));

  return Response.json({
    results,
    nextCursor:
      offset + PAGE_SIZE < filtered.length ? String(offset + PAGE_SIZE) : null,
    prevCursor: offset > 0 ? String(Math.max(0, offset - PAGE_SIZE)) : null,
  });
}
