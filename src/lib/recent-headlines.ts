import { getAdminDb } from "./firebase/admin";

/**
 * The previous published Long View headlines, most recent first. Fed to the
 * headline generator and validators so new headlines cannot drift back into
 * overused wording or repeated constructions.
 */
export async function fetchRecentPublishedHeadlines(
  limit = 50
): Promise<string[]> {
  const snap = await getAdminDb()
    .collection("histories")
    .orderBy("generatedAt", "desc")
    .limit(limit)
    .get();
  return snap.docs
    .map((d) => d.data().truthHeadline)
    .filter((h): h is string => typeof h === "string" && h.length > 0);
}
