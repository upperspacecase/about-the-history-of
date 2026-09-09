import { FieldPath } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getPublicEdition } from "@/lib/public-story";
import type { Edition } from "@/lib/story-types";

export const dynamic = "force-dynamic";

// Published edition access (PRD §12): ?date=YYYY-MM-DD for one edition,
// ?list=1[&before=YYYY-MM-DD] for the editions index, no params for the
// latest. Only published records are returned.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const list = url.searchParams.get("list");

  if (list) {
    const before = url.searchParams.get("before");
    // Edition ids are YYYY-MM-DD, so document-id order is date order.
    let query = getAdminDb()
      .collection("editions")
      .orderBy(FieldPath.documentId(), "desc")
      .limit(30);
    if (before && /^\d{4}-\d{2}-\d{2}$/.test(before)) {
      query = query.startAfter(before);
    }
    const snap = await query.get();
    const editions = snap.docs.map((d) => {
      const e = d.data() as Edition;
      return {
        id: e.id,
        status: e.status,
        publishedAt: e.publishedAt,
        storyCount: e.storyVersionIds.length,
        readingMinutes: e.readingMinutes,
      };
    });
    return Response.json({ editions });
  }

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "invalid date" }, { status: 400 });
  }

  const edition = await getPublicEdition(date ?? undefined);
  if (!edition) {
    return Response.json(
      { status: "unavailable", error: "no published edition" },
      { status: 404 }
    );
  }
  return Response.json({ edition });
}
