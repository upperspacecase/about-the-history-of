// Daily metrics collector for the marketing loop. Runs on its own GitHub Action
// (see .github/workflows/collect-insights.yml). Three jobs, each independent so
// one failing does not block the others:
//
//   1. Reel insights  — refresh views/reach/etc onto each recent posts/{id} doc
//   2. Account snapshot — followers/reach into today's metricsDaily doc
//   3. Daily counts    — signups + customers per UTC day (timing-based), back-
//                        filled for the last week so the 48h insights lag and
//                        late-arriving payments are corrected on each run.
//
// On-site clicks live in the same metricsDaily docs but are owned by /api/track
// (FieldValue.increment) — this collector never writes the `clicks` field.

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "../src/lib/firebase/admin";
import { dayKey, METRICS_DAILY } from "../src/lib/metrics";
import {
  getReelInsights,
  getAccountInsights,
  getInsightsCredentials,
} from "./lib/meta-insights";

const REEL_LOOKBACK_DAYS = 14; // Reel insights keep accruing for ~2 weeks
const COUNT_LOOKBACK_DAYS = 8; // re-count the last week to absorb late data

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDayStart(date: Date): Date {
  return new Date(`${dayKey(date)}T00:00:00.000Z`);
}

async function collectReelInsights(token: string) {
  const db = getAdminDb();
  const cutoff = Timestamp.fromDate(new Date(Date.now() - REEL_LOOKBACK_DAYS * DAY_MS));
  const snap = await db.collection("posts").where("postedAt", ">=", cutoff).get();

  let updated = 0;
  for (const doc of snap.docs) {
    const mediaId = doc.data().instagramMediaId as string | undefined;
    if (!mediaId) continue;
    try {
      const insights = await getReelInsights(mediaId, token);
      await doc.ref.set({ insights }, { merge: true });
      updated += 1;
    } catch (err) {
      console.error(`Reel insights failed for ${doc.id}:`, err);
    }
  }
  console.log(`Reel insights updated on ${updated}/${snap.size} recent post(s).`);
}

async function collectAccountSnapshot(igUserId: string, token: string) {
  const db = getAdminDb();
  const account = await getAccountInsights(igUserId, token);
  const today = dayKey(new Date());
  await db
    .collection(METRICS_DAILY)
    .doc(today)
    .set({ date: today, account, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  console.log(`Account snapshot for ${today}:`, JSON.stringify(account));
}

async function collectDailyCounts() {
  const db = getAdminDb();
  const todayStart = utcDayStart(new Date());

  for (let i = 0; i < COUNT_LOOKBACK_DAYS; i++) {
    const start = new Date(todayStart.getTime() - i * DAY_MS);
    const end = new Date(start.getTime() + DAY_MS);
    const date = dayKey(start);
    const lo = Timestamp.fromDate(start);
    const hi = Timestamp.fromDate(end);

    const signupsSnap = await db
      .collection("subscribers")
      .where("createdAt", ">=", lo)
      .where("createdAt", "<", hi)
      .count()
      .get();
    const customersSnap = await db
      .collection("paidCustomers")
      .where("paidAt", ">=", lo)
      .where("paidAt", "<", hi)
      .count()
      .get();

    await db
      .collection(METRICS_DAILY)
      .doc(date)
      .set(
        {
          date,
          signups: signupsSnap.data().count,
          customers: customersSnap.data().count,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  }
  console.log(`Daily signup/customer counts written for the last ${COUNT_LOOKBACK_DAYS} day(s).`);
}

async function main() {
  // Firestore-only counts always run.
  await collectDailyCounts();

  // IG insights run only if the token + account id are configured.
  let creds: { igUserId: string; token: string } | null = null;
  try {
    creds = getInsightsCredentials();
  } catch (err) {
    console.warn(
      `Skipping Instagram insights — ${err instanceof Error ? err.message : String(err)}. ` +
        `Set META_PAGE_ACCESS_TOKEN (with instagram_manage_insights) and IG_USER_ID.`,
    );
  }

  if (creds) {
    await collectAccountSnapshot(creds.igUserId, creds.token);
    await collectReelInsights(creds.token);
  }

  console.log("Insights collection done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
