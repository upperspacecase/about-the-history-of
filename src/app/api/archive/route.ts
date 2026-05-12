import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

interface ArchiveDoc {
  headline?: string;
  truthHeadline?: string;
  significance?: number;
  significanceReason?: string;
  topic?: string;
  generatedAt?: Timestamp;
}

interface ArchiveHeadline {
  title: string;
  link: string;
  source: string;
  category: string;
  pubDate: string;
  snippet: string;
  truthHeadline?: string;
  significance?: number;
  significanceReason?: string;
  hasHistory: true;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json(
      { error: "date query parameter required as YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  if (Number.isNaN(start.getTime())) {
    return Response.json({ error: "invalid date" }, { status: 400 });
  }

  const db = getAdminDb();
  const snap = await db
    .collection("histories")
    .where("generatedAt", ">=", Timestamp.fromDate(start))
    .where("generatedAt", "<", Timestamp.fromDate(end))
    .orderBy("generatedAt", "desc")
    .limit(120)
    .get();

  const headlines: ArchiveHeadline[] = snap.docs.map((doc) => {
    const data = doc.data() as ArchiveDoc;
    const generated = data.generatedAt?.toDate?.();
    return {
      title: data.headline ?? "",
      link: "",
      source: "Archive",
      category: data.topic ?? "",
      pubDate: generated ? generated.toISOString() : "",
      snippet: "",
      truthHeadline:
        typeof data.truthHeadline === "string" && data.truthHeadline.trim()
          ? data.truthHeadline
          : undefined,
      significance:
        typeof data.significance === "number" ? data.significance : undefined,
      significanceReason:
        typeof data.significanceReason === "string" &&
        data.significanceReason.trim()
          ? data.significanceReason
          : undefined,
      hasHistory: true,
    };
  });

  return Response.json({ headlines, date });
}
