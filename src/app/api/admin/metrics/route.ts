import { Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  ADMIN_EMAIL,
  METRICS_DAILY,
  WEEKLY_REPORTS,
  type AdminMetricsResponse,
  type CustomerRow,
  type DailyMetrics,
  type ReelRow,
  type WeeklyReport,
} from "@/lib/metrics";

export const dynamic = "force-dynamic";

function toIso(value: unknown): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}

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

  // Last 30 days of daily metrics, returned oldest-first for charting.
  const dailySnap = await db
    .collection(METRICS_DAILY)
    .orderBy("date", "desc")
    .limit(30)
    .get();
  const daily = dailySnap.docs
    .map((d) => d.data() as DailyMetrics)
    .reverse();

  // Recent posts with their insights — the reel leaderboard source.
  const postsSnap = await db
    .collection("posts")
    .orderBy("postedAt", "desc")
    .limit(50)
    .get();
  const reels: ReelRow[] = postsSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      headline: (data.headline as string) ?? d.id,
      postedAt: toIso(data.postedAt),
      insights: data.insights,
    };
  });

  // Customers: merge pay-first payers (paidCustomers) with signed-in payers
  // (users.isPaying). Dedupe by email; an account doc wins (hasAccount=true).
  const byEmail = new Map<string, CustomerRow>();

  const paidSnap = await db.collection("paidCustomers").get();
  for (const doc of paidSnap.docs) {
    const data = doc.data();
    const key = (data.email as string | undefined)?.toLowerCase();
    if (!key) continue;
    byEmail.set(key, {
      email: key,
      plan: (data.plan as string) ?? null,
      status: (data.stripeStatus as string) ?? null,
      since: toIso(data.paidAt),
      hasAccount: false,
    });
  }

  const usersSnap = await db
    .collection("users")
    .where("isPaying", "==", true)
    .get();
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const key = (data.email as string | undefined)?.toLowerCase();
    if (!key) continue;
    const existing = byEmail.get(key);
    byEmail.set(key, {
      email: key,
      plan: (data.plan as string) ?? existing?.plan ?? null,
      status: (data.stripeStatus as string) ?? existing?.status ?? null,
      since: toIso(data.subscribedAt) ?? existing?.since ?? null,
      hasAccount: true,
    });
  }

  const customers = [...byEmail.values()].sort((a, b) =>
    (b.since ?? "").localeCompare(a.since ?? "")
  );

  const subscribersCount = (
    await db.collection("subscribers").count().get()
  ).data().count;

  // Latest weekly report (populated by the weekly job — may not exist yet).
  const reportSnap = await db
    .collection(WEEKLY_REPORTS)
    .orderBy("week", "desc")
    .limit(1)
    .get();
  const latestReport: WeeklyReport | null = reportSnap.empty
    ? null
    : (reportSnap.docs[0].data() as WeeklyReport);

  const payload: AdminMetricsResponse = {
    daily,
    reels,
    customers,
    totals: { subscribers: subscribersCount, customers: customers.length },
    latestReport,
  };

  return Response.json(payload);
}
