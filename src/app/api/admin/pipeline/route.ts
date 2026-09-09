import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { ADMIN_EMAIL } from "@/lib/metrics";
import type { Edition, PipelineRun } from "@/lib/story-types";

export const dynamic = "force-dynamic";

// Operational status for the admin dashboard (OPS 05): recent pipeline runs
// with stage outcomes and per-candidate decisions, recent editions, and
// open reader error reports. Same operator gate as the metrics API.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  let email: string | undefined;
  try {
    email = (await getAdminAuth().verifyIdToken(token)).email;
  } catch {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }
  if (email?.toLowerCase() !== ADMIN_EMAIL) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const db = getAdminDb();

  const runsSnap = await db
    .collection("pipelineRuns")
    .orderBy("startedAt", "desc")
    .limit(7)
    .get();
  const runs = runsSnap.docs.map((d) => d.data() as PipelineRun);

  const editionsSnap = await db
    .collection("editions")
    .orderBy("publishedAt", "desc")
    .limit(7)
    .get();
  const editions = editionsSnap.docs.map((d) => {
    const e = d.data() as Edition;
    return {
      id: e.id,
      status: e.status,
      storyCount: e.storyVersionIds.length,
      publishedAt: e.publishedAt,
      coverage: e.coverage,
    };
  });

  const reportsSnap = await db
    .collection("errorReports")
    .where("status", "==", "open")
    .limit(50)
    .get();
  const errorReports = reportsSnap.docs.map((d) => {
    const r = d.data() as {
      storyId: string;
      versionId: string;
      text: string;
      link?: string;
      createdAt: string;
    };
    return {
      id: d.id,
      storyId: r.storyId,
      versionId: r.versionId,
      text: r.text,
      link: r.link ?? "",
      createdAt: r.createdAt,
    };
  });

  const deliveriesSnap = await db
    .collection("deliveries")
    .orderBy("updatedAt", "desc")
    .limit(30)
    .get();
  const deliveries = deliveriesSnap.docs.map((d) => d.data());

  return Response.json({ runs, editions, errorReports, deliveries });
}
