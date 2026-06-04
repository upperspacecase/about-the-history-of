// Shared shapes + constants for the marketing metrics loop. Pure types and
// constants only (no firebase-admin import) so this is safe to import from both
// the collector scripts and client components.

export const ADMIN_EMAIL = "taytoddpattison@gmail.com";

export const METRICS_DAILY = "metricsDaily";
export const WEEKLY_REPORTS = "weeklyReports";

// Instagram media (Reel) insights. `plays`/`video_views`/`impressions` are
// deprecated in the Graph API as of Apr 2025 — `views` replaces them.
// Verified against graph.facebook.com v25.0 (developers.facebook.com, 2026-06-04).
export const REEL_INSIGHT_METRICS = [
  "views",
  "reach",
  "likes",
  "comments",
  "saved",
  "shares",
  "total_interactions",
] as const;

export type ReelMetric = (typeof REEL_INSIGHT_METRICS)[number];

export type ReelInsights = Partial<Record<ReelMetric, number>> & {
  collectedAt?: string; // ISO timestamp of the run that wrote these values
};

// On-site click counters, incremented by /api/track. Keyed by CTA so we can see
// which surfaces drive action. Timing-based only — no per-visitor attribution.
export interface OnSiteClicks {
  subscribe?: number;
  signin?: number;
  checkout?: number;
}

export type ClickTarget = keyof OnSiteClicks;

export const CLICK_TARGETS: ClickTarget[] = ["subscribe", "signin", "checkout"];

// Account-level snapshot taken once per collector run.
export interface AccountSnapshot {
  followerCount?: number;
  reach?: number;
  follows?: number; // net follows from follows_and_unfollows
  unfollows?: number;
  profileClicks?: number; // IG-side profile/link taps, if the API returns them
  collectedAt?: string;
}

// One document per UTC day in `metricsDaily`. Written by multiple owners with
// merge:true — the collector owns `account`, `signups`, `customers`; /api/track
// owns `clicks`. Never overwrite the whole doc.
export interface DailyMetrics {
  date: string; // YYYY-MM-DD (UTC)
  account?: AccountSnapshot;
  signups?: number; // subscribers created this UTC day (timing-based)
  customers?: number; // paidCustomers that paid this UTC day (timing-based)
  clicks?: OnSiteClicks;
  updatedAt?: string;
}

// UTC day key, matching the format daily-post.ts uses for blob paths.
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ---- Admin dashboard / weekly report shapes (shared by the API + the page) ----

export interface ReelRow {
  id: string;
  headline: string;
  postedAt: string | null; // ISO
  insights?: ReelInsights;
}

export interface CustomerRow {
  email: string;
  plan: string | null;
  status: string | null; // Stripe subscription status
  since: string | null; // ISO — paidAt or subscribedAt
  hasAccount: boolean; // true once they have a signed-in users/{uid} doc
}

export interface WeeklyRecommendation {
  area: "caption" | "reel";
  change: string;
  rationale: string;
}

export interface WeeklyReport {
  week: string; // YYYY-Www
  generatedAt?: string; // ISO
  summary: string;
  recommendations: WeeklyRecommendation[];
  topReels?: ReelRow[];
}

export interface AdminMetricsResponse {
  daily: DailyMetrics[]; // chronological (oldest first)
  reels: ReelRow[]; // recent posts with insights
  customers: CustomerRow[];
  totals: { subscribers: number; customers: number };
  latestReport: WeeklyReport | null;
}
