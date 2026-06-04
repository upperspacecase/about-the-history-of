// Weekly feedback loop for the marketing engine. Runs on its own GitHub Action
// (weekly-insights.yml, Sundays). Reads the week's REAL reel performance + funnel
// numbers from Firestore, asks Claude for qualitative recommendations on the two
// levers we actually control — the caption builder (src/lib/caption.ts) and the
// Remotion reel card (remotion/AnimatedTitleCard.tsx) — then:
//
//   1. writes weeklyReports/{YYYY-Www} (read by the admin dashboard), and
//   2. writes docs/weekly-reports/{YYYY-Www}.md into the working tree so the
//      workflow can open a PR with the report.
//
// All numbers in the report come from Firestore; Claude only produces the
// summary + recommendations. With too little data it returns a clearly-labelled
// best-practices baseline (a starting hypothesis, not measured findings).

import { mkdir, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "../src/lib/firebase/admin";
import {
  METRICS_DAILY,
  WEEKLY_REPORTS,
  type DailyMetrics,
  type ReelInsights,
  type ReelRow,
  type WeeklyRecommendation,
  type WeeklyReport,
} from "../src/lib/metrics";

const SAMPLE_DAYS = 14; // reels keep accruing views ~2 weeks
const MIN_REELS_FOR_ANALYSIS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

interface PerfRow {
  headline: string;
  truthHeadline?: string;
  topic?: string;
  significance?: number;
  views?: number;
  reach?: number;
  likes?: number;
  saved?: number;
  shares?: number;
  totalInteractions?: number;
  engagementRate?: number; // total_interactions / reach
}

function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon = 0 … Sun = 6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // Thursday decides the ISO year
  const year = date.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / DAY_MS + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

async function gatherReels(): Promise<PerfRow[]> {
  const db = getAdminDb();
  const cutoff = Timestamp.fromDate(new Date(Date.now() - SAMPLE_DAYS * DAY_MS));
  const snap = await db.collection("posts").where("postedAt", ">=", cutoff).get();

  const rows: PerfRow[] = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    const insights = data.insights as ReelInsights | undefined;
    if (!insights || typeof insights.views !== "number") continue;

    // posts/{id} and histories/{id} share the same headlineKey id.
    const history = (await db.collection("histories").doc(doc.id).get()).data();
    const reach = insights.reach ?? 0;
    rows.push({
      headline: (data.headline as string) ?? doc.id,
      truthHeadline: history?.truthHeadline as string | undefined,
      topic: history?.topic as string | undefined,
      significance: history?.significance as number | undefined,
      views: insights.views,
      reach: insights.reach,
      likes: insights.likes,
      saved: insights.saved,
      shares: insights.shares,
      totalInteractions: insights.total_interactions,
      engagementRate:
        reach > 0 && typeof insights.total_interactions === "number"
          ? Number((insights.total_interactions / reach).toFixed(4))
          : undefined,
    });
  }
  rows.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
  return rows;
}

async function gatherFunnel() {
  const db = getAdminDb();
  const snap = await db
    .collection(METRICS_DAILY)
    .orderBy("date", "desc")
    .limit(7)
    .get();
  const days = snap.docs.map((d) => d.data() as DailyMetrics);

  const sum = (pick: (d: DailyMetrics) => number | undefined) =>
    days.reduce((acc, d) => acc + (pick(d) ?? 0), 0);

  const followerValues = days
    .map((d) => d.account?.followerCount)
    .filter((v): v is number => typeof v === "number");

  return {
    signups: sum((d) => d.signups),
    customers: sum((d) => d.customers),
    subscribeClicks: sum((d) => d.clicks?.subscribe),
    checkoutClicks: sum((d) => d.clicks?.checkout),
    signinClicks: sum((d) => d.clicks?.signin),
    followerLatest: followerValues[0],
    followerWeekAgo: followerValues[followerValues.length - 1],
  };
}

const SYSTEM_PROMPT = `You are the growth analyst for "The Long View", an Instagram Reels account that posts daily history-of-the-news Reels. Each Reel is a 384-frame (~12.8s) Remotion card: the original headline types in, gets struck through, then a reframed "truth headline" types in green, ending on a thelongview.org card.

You tune two levers only:
- CAPTION (src/lib/caption.ts): the hook lead line, how significance is framed, the historical "rhyme" proof line, the CTA, and hashtag strategy.
- REEL build (remotion/AnimatedTitleCard.tsx): animation pacing/beats, headline font size (currently 84px), kicker styling, total length, what text is emphasised.

You will be given this week's REAL performance numbers. Do not invent or restate numbers that were not provided. Produce concise, specific, testable recommendations grounded in the data (or, if data is thin, clearly-labelled best-practice starting hypotheses).

Respond with ONLY a JSON object, no prose, no code fences:
{
  "summary": "2-4 sentences on how the week went and the clearest signal.",
  "recommendations": [
    { "area": "caption" | "reel", "change": "the specific change to try", "rationale": "why, tied to the data or a named best practice" }
  ]
}
Return 3-6 recommendations.`;

function buildUserPrompt(
  reels: PerfRow[],
  funnel: Awaited<ReturnType<typeof gatherFunnel>>,
  baseline: boolean,
): string {
  if (baseline) {
    return `There is not yet enough reel-performance data (fewer than ${MIN_REELS_FOR_ANALYSIS} reels with insights). Treat this as the kickoff: give best-practice starting hypotheses for a daily history-of-the-news Reels account, split across the caption and reel-build levers, each clearly framed as a hypothesis to test (not a measured finding). This week's funnel so far: ${JSON.stringify(
      funnel,
    )}.`;
  }
  return `This week's reel performance (sorted by views, real numbers from Instagram insights):
${JSON.stringify(reels, null, 2)}

This week's funnel (real numbers): ${JSON.stringify(funnel, null, 2)}

Identify what correlates with strong views/saves/shares (topic, significance band, hook style) and recommend specific caption and reel-build changes to test next week.`;
}

async function generateReport(week: string): Promise<WeeklyReport> {
  const reels = await gatherReels();
  const funnel = await gatherFunnel();
  const baseline = reels.length < MIN_REELS_FOR_ANALYSIS;

  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: buildUserPrompt(reels, funnel, baseline) },
    ],
  });
  const text = message.content[0]?.type === "text" ? message.content[0].text : "";
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const parsed = JSON.parse(cleaned) as {
    summary: string;
    recommendations: WeeklyRecommendation[];
  };

  const topReels: ReelRow[] = reels.slice(0, 5).map((r) => ({
    id: r.headline,
    headline: r.truthHeadline ?? r.headline,
    postedAt: null,
    insights: {
      views: r.views,
      reach: r.reach,
      likes: r.likes,
      saved: r.saved,
      shares: r.shares,
      total_interactions: r.totalInteractions,
    },
  }));

  return {
    week,
    generatedAt: new Date().toISOString(),
    summary: parsed.summary,
    recommendations: parsed.recommendations.filter(
      (r) => r.area === "caption" || r.area === "reel",
    ),
    topReels,
  };
}

function toMarkdown(report: WeeklyReport): string {
  const recs = report.recommendations
    .map((r) => `- **${r.area}** — ${r.change}\n  - _${r.rationale}_`)
    .join("\n");
  const reels = report.topReels?.length
    ? report.topReels
        .map(
          (r) =>
            `| ${r.headline.replace(/\|/g, "/")} | ${r.insights?.views ?? "—"} | ${r.insights?.reach ?? "—"} | ${r.insights?.saved ?? "—"} | ${r.insights?.shares ?? "—"} |`,
        )
        .join("\n")
    : "_No reel insights this period._";
  return `# The Long View — Weekly Report ${report.week}

_Generated ${report.generatedAt}._

## Summary

${report.summary}

## Recommendations

${recs}

## Top reels (by views)

| Headline | Views | Reach | Saves | Shares |
| --- | --- | --- | --- | --- |
${reels}
`;
}

async function main() {
  const week = isoWeek(new Date());
  const report = await generateReport(week);

  await getAdminDb().collection(WEEKLY_REPORTS).doc(week).set(report);

  const dir = path.join("docs", "weekly-reports");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${week}.md`);
  await writeFile(filePath, toMarkdown(report), "utf8");

  console.log(`Wrote weekly report ${week} (${report.recommendations.length} recs) to Firestore + ${filePath}.`);

  // Hand the week + path to the workflow so it can branch/commit/PR.
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `week=${week}\nreport_path=${filePath}\n`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
