import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  CLICK_TARGETS,
  METRICS_DAILY,
  dayKey,
  type ClickTarget,
} from "@/lib/metrics";

// Fire-and-forget on-site click counter. Increments today's metricsDaily doc by
// CTA. No PII, no auth — it only bumps an integer. The collector owns the rest
// of the doc (account/signups/customers); this route only touches `clicks`.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { target?: unknown };
  if (!CLICK_TARGETS.includes(body.target as ClickTarget)) {
    return Response.json({ error: "Unknown click target" }, { status: 400 });
  }
  const target = body.target as ClickTarget;
  const date = dayKey(new Date());

  await getAdminDb()
    .collection(METRICS_DAILY)
    .doc(date)
    .set(
      {
        date,
        clicks: { [target]: FieldValue.increment(1) },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  return Response.json({ ok: true });
}
