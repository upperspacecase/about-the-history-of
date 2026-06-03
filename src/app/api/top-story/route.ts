import { getAdminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

// Returns the most significant of the recently-generated histories — "today's
// top story" — for the paywall preview.
export async function GET() {
  const snap = await getAdminDb()
    .collection("histories")
    .orderBy("generatedAt", "desc")
    .limit(30)
    .get();

  let top: Record<string, unknown> | null = null;
  let topScore = -1;
  for (const doc of snap.docs) {
    const data = doc.data();
    const score = Number(data.significance) || 0;
    if (data.truthHeadline && score > topScore) {
      top = data;
      topScore = score;
    }
  }

  if (!top) {
    return Response.json({ error: "No story available" }, { status: 404 });
  }
  return Response.json(top);
}
