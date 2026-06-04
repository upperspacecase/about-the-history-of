// Reading insights from the Meta Graph API for the marketing metrics loop.
// Reuses the graph helpers from meta-publish so there is one HTTP/parse path.
//
// Reel (media) insights:    GET /<IG_MEDIA_ID>/insights?metric=...
// Account (user) insights:  GET /<IG_USER_ID>/insights?metric=...&period=...
//
// Requires META_PAGE_ACCESS_TOKEN with the `instagram_manage_insights` scope
// (plus instagram_basic, pages_read_engagement). Verified against
// graph.facebook.com v25.0 (developers.facebook.com, 2026-06-04).
//
// The account-insights param matrix (period / metric_type per metric) is fiddly
// and a single bad combo errors the whole call — so every metric is requested
// independently and failures are logged and skipped rather than thrown. Confirm
// the exact account metric set against the live API once the token has the
// insights scope; the run logs which metrics returned data.

import { graphGet, requireEnv } from "./meta-publish";
import {
  REEL_INSIGHT_METRICS,
  type ReelInsights,
  type AccountSnapshot,
} from "../../src/lib/metrics";

interface InsightEntry {
  name: string;
  period?: string;
  values?: Array<{ value: unknown }>;
  total_value?: { value: unknown };
}

interface InsightsResponse {
  data?: InsightEntry[];
}

function toNumber(value: unknown): number | undefined {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

// Pull a single scalar out of an insight entry: prefer total_value, else the
// last point in the values series (the most recent day).
function entryValue(entry: InsightEntry): number | undefined {
  if (entry.total_value) return toNumber(entry.total_value.value);
  const values = entry.values ?? [];
  for (let i = values.length - 1; i >= 0; i--) {
    const n = toNumber(values[i]?.value);
    if (n !== undefined) return n;
  }
  return undefined;
}

function parseEntries(res: InsightsResponse): Record<string, number> {
  const out: Record<string, number> = {};
  for (const entry of res.data ?? []) {
    const n = entryValue(entry);
    if (n !== undefined) out[entry.name] = n;
  }
  return out;
}

/**
 * Lifetime insights for one published Reel. Tries the full metric list in one
 * call, then falls back to per-metric requests so a single unsupported metric
 * does not drop the rest. Returns whatever the API had data for.
 */
export async function getReelInsights(
  mediaId: string,
  token: string,
): Promise<ReelInsights> {
  const metricParam = REEL_INSIGHT_METRICS.join(",");
  let parsed: Record<string, number> = {};
  try {
    const res = await graphGet<InsightsResponse>(
      `/${mediaId}/insights`,
      { metric: metricParam },
      token,
    );
    parsed = parseEntries(res);
  } catch (err) {
    console.warn(
      `Reel insights batch failed for ${mediaId}, retrying per-metric: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    for (const metric of REEL_INSIGHT_METRICS) {
      try {
        const res = await graphGet<InsightsResponse>(
          `/${mediaId}/insights`,
          { metric },
          token,
        );
        Object.assign(parsed, parseEntries(res));
      } catch {
        /* metric not supported for this media — skip */
      }
    }
  }
  return { ...(parsed as ReelInsights), collectedAt: new Date().toISOString() };
}

// Numeric fields of AccountSnapshot (everything except the collectedAt stamp).
type NumericAccountKey = Exclude<keyof AccountSnapshot, "collectedAt">;

// Each account metric is fetched independently with its own params so an
// incompatible period/metric_type combo only loses that one metric.
const ACCOUNT_METRICS: Array<{
  key: NumericAccountKey;
  params: Record<string, string>;
}> = [
  { key: "followerCount", params: { metric: "follower_count", period: "day" } },
  {
    key: "reach",
    params: { metric: "reach", period: "day", metric_type: "total_value" },
  },
];

/**
 * Account-level snapshot for today. Best-effort: every metric is independent,
 * failures are logged and skipped. follower_count needs >=100 followers or the
 * API returns an error for that metric.
 */
export async function getAccountInsights(
  igUserId: string,
  token: string,
): Promise<AccountSnapshot> {
  const snapshot: AccountSnapshot = { collectedAt: new Date().toISOString() };
  for (const { key, params } of ACCOUNT_METRICS) {
    try {
      const res = await graphGet<InsightsResponse>(
        `/${igUserId}/insights`,
        params,
        token,
      );
      const parsed = parseEntries(res);
      const value = parsed[params.metric];
      if (value !== undefined) snapshot[key] = value;
    } catch (err) {
      console.warn(
        `Account metric "${params.metric}" failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
  return snapshot;
}

/** Read the IG account id + insights token from env (throws if missing). */
export function getInsightsCredentials(): { igUserId: string; token: string } {
  return {
    igUserId: requireEnv("IG_USER_ID"),
    token: requireEnv("META_PAGE_ACCESS_TOKEN"),
  };
}
