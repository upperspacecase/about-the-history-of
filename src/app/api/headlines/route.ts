import { unstable_cache } from "next/cache";
import { getAdminDb } from "@/lib/firebase/admin";
import { headlineKey } from "@/lib/history-key";
import { fetchAllHeadlines, type Headline } from "@/lib/feeds";

export const dynamic = "force-dynamic";

const fetchTopHeadlines = unstable_cache(
  fetchAllHeadlines,
  ["headlines-rss-top"],
  { revalidate: 600 }
);

export async function GET() {
  const top = await fetchTopHeadlines();
  const enriched = await attachHistory(top);

  enriched.sort((a, b) => {
    const aHas = a.hasHistory ? 1 : 0;
    const bHas = b.hasHistory ? 1 : 0;
    if (aHas !== bHas) return bHas - aHas;
    const aScore = a.significance ?? 0;
    const bScore = b.significance ?? 0;
    if (aScore !== bScore) return bScore - aScore;
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });

  return Response.json({ headlines: enriched });
}

interface HistorySnapshot {
  truthHeadline?: string;
  significance?: number;
  significanceReason?: string;
}

async function attachHistory(headlines: Headline[]): Promise<Headline[]> {
  if (headlines.length === 0) return headlines;
  try {
    const db = getAdminDb();
    const refs = headlines.map((h) =>
      db.collection("histories").doc(headlineKey(h.title))
    );
    const snaps = await db.getAll(...refs);
    return headlines.map((h, i) => {
      const snap = snaps[i];
      if (!snap.exists) return h;
      const data = snap.data() as HistorySnapshot | undefined;
      const truthHeadline =
        typeof data?.truthHeadline === "string" && data.truthHeadline.trim()
          ? data.truthHeadline
          : undefined;
      const rawScore = Number(data?.significance);
      const significance = Number.isFinite(rawScore)
        ? Math.min(10, Math.max(1, Math.round(rawScore)))
        : undefined;
      const significanceReason =
        typeof data?.significanceReason === "string" &&
        data.significanceReason.trim()
          ? data.significanceReason
          : undefined;
      return {
        ...h,
        hasHistory: true,
        truthHeadline,
        significance,
        significanceReason,
      };
    });
  } catch (err) {
    console.error("Failed to attach history metadata:", err);
    return headlines;
  }
}
