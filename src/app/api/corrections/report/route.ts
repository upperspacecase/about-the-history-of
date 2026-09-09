import { createHash } from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";

// Bounded error-report submission with abuse protection (§12): length caps,
// and at most one report per version per client per hour via a
// deterministic create-only document id. Reports are triaged operator-side;
// factual changes follow the evidence and correction workflow.
export async function POST(request: Request) {
  let body: { storyId?: unknown; versionId?: unknown; text?: unknown; link?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid request" }, { status: 400 });
  }

  const storyId = typeof body.storyId === "string" ? body.storyId.slice(0, 80) : "";
  const versionId =
    typeof body.versionId === "string" ? body.versionId.slice(0, 90) : "";
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 2000) : "";
  const link = typeof body.link === "string" ? body.link.trim().slice(0, 500) : "";

  if (!storyId || !versionId || !text) {
    return Response.json({ error: "invalid request" }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const hour = new Date().toISOString().slice(0, 13);
  const clientHash = createHash("sha256")
    .update(`${ip}:${versionId}:${hour}`)
    .digest("hex")
    .slice(0, 24);

  const db = getAdminDb();
  try {
    await db.collection("errorReports").doc(clientHash).create({
      storyId,
      versionId,
      text,
      link,
      createdAt: new Date().toISOString(),
      status: "open",
    });
  } catch {
    // Duplicate within the hour: acknowledge without writing again.
  }

  return Response.json({ ok: true });
}
