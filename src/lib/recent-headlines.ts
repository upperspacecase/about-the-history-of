import { getAdminDb } from "./firebase/admin";

/**
 * The previous published Long View headlines, most recent first. Fed to the
 * headline generator and validators so new headlines cannot drift back into
 * overused wording or repeated constructions. Reads canonical story
 * versions first; falls back to the legacy histories collection while the
 * version archive is still young.
 */
export async function fetchRecentPublishedHeadlines(
  limit = 50
): Promise<string[]> {
  const db = getAdminDb();

  const versions = await db
    .collection("storyVersions")
    .orderBy("publishedAt", "desc")
    .limit(limit)
    .get();
  const fromVersions = versions.docs
    .map((d) => (d.data() as { doc?: { truthHeadline?: string } }).doc?.truthHeadline)
    .filter((h): h is string => typeof h === "string" && h.length > 0);
  if (fromVersions.length >= Math.min(10, limit)) return fromVersions;

  const legacy = await db
    .collection("histories")
    .orderBy("generatedAt", "desc")
    .limit(limit - fromVersions.length)
    .get();
  const fromLegacy = legacy.docs
    .map((d) => d.data().truthHeadline)
    .filter((h): h is string => typeof h === "string" && h.length > 0);

  return [...fromVersions, ...fromLegacy];
}
