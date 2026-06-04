"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-context";
import {
  ADMIN_EMAIL,
  type AdminMetricsResponse,
  type DailyMetrics,
  type ReelRow,
} from "@/lib/metrics";

const fmt = (n: number | undefined | null) =>
  typeof n === "number" ? n.toLocaleString() : "—";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border rounded p-4">
      <p className="text-xs uppercase tracking-widest text-muted">{label}</p>
      <p
        className="text-2xl font-bold mt-1"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {value}
      </p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-lg font-bold mb-3 mt-10"
      style={{ fontFamily: "var(--font-serif)" }}
    >
      {children}
    </h2>
  );
}

function FollowerTrend({ daily }: { daily: DailyMetrics[] }) {
  const points = daily
    .map((d) => ({ date: d.date, value: d.account?.followerCount }))
    .filter((p): p is { date: string; value: number } => typeof p.value === "number");
  if (points.length < 2) {
    return (
      <p className="text-sm text-muted">
        Follower history appears once the collector has run on 2+ days (needs
        ≥100 followers for Instagram to report the metric).
      </p>
    );
  }
  const max = Math.max(...points.map((p) => p.value));
  const min = Math.min(...points.map((p) => p.value));
  const span = Math.max(1, max - min);
  return (
    <div>
      <div className="flex items-end gap-1 h-24">
        {points.map((p) => (
          <div
            key={p.date}
            title={`${p.date}: ${p.value.toLocaleString()}`}
            className="flex-1 bg-accent/70 rounded-t"
            style={{ height: `${10 + ((p.value - min) / span) * 90}%` }}
          />
        ))}
      </div>
      <p className="text-xs text-muted mt-1">
        {points[0].date} → {points[points.length - 1].date} ·{" "}
        {fmt(min)}–{fmt(max)} followers
      </p>
    </div>
  );
}

function DailyTable({ daily }: { daily: DailyMetrics[] }) {
  const rows = [...daily].reverse().slice(0, 14);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted border-b border-border">
            <th className="py-2 pr-4">Date</th>
            <th className="py-2 pr-4">Followers</th>
            <th className="py-2 pr-4">Reach</th>
            <th className="py-2 pr-4">Subscribe</th>
            <th className="py-2 pr-4">Checkout</th>
            <th className="py-2 pr-4">Sign-in</th>
            <th className="py-2 pr-4">Signups</th>
            <th className="py-2 pr-4">Customers</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.date} className="border-b border-border/50">
              <td className="py-2 pr-4 whitespace-nowrap">{d.date}</td>
              <td className="py-2 pr-4">{fmt(d.account?.followerCount)}</td>
              <td className="py-2 pr-4">{fmt(d.account?.reach)}</td>
              <td className="py-2 pr-4">{fmt(d.clicks?.subscribe)}</td>
              <td className="py-2 pr-4">{fmt(d.clicks?.checkout)}</td>
              <td className="py-2 pr-4">{fmt(d.clicks?.signin)}</td>
              <td className="py-2 pr-4">{fmt(d.signups)}</td>
              <td className="py-2 pr-4">{fmt(d.customers)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReelLeaderboard({ reels }: { reels: ReelRow[] }) {
  const ranked = reels
    .filter((r) => r.insights && typeof r.insights.views === "number")
    .sort((a, b) => (b.insights?.views ?? 0) - (a.insights?.views ?? 0))
    .slice(0, 10);
  if (ranked.length === 0) {
    return (
      <p className="text-sm text-muted">
        No reel insights yet — they appear after the collector runs against a
        token with the insights scope.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted border-b border-border">
            <th className="py-2 pr-4">Headline</th>
            <th className="py-2 pr-4">Views</th>
            <th className="py-2 pr-4">Reach</th>
            <th className="py-2 pr-4">Likes</th>
            <th className="py-2 pr-4">Saves</th>
            <th className="py-2 pr-4">Shares</th>
            <th className="py-2 pr-4">Posted</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((r) => (
            <tr key={r.id} className="border-b border-border/50">
              <td className="py-2 pr-4 max-w-xs">{r.headline}</td>
              <td className="py-2 pr-4">{fmt(r.insights?.views)}</td>
              <td className="py-2 pr-4">{fmt(r.insights?.reach)}</td>
              <td className="py-2 pr-4">{fmt(r.insights?.likes)}</td>
              <td className="py-2 pr-4">{fmt(r.insights?.saved)}</td>
              <td className="py-2 pr-4">{fmt(r.insights?.shares)}</td>
              <td className="py-2 pr-4 whitespace-nowrap text-muted">
                {r.postedAt?.slice(0, 10) ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomerTable({ data }: { data: AdminMetricsResponse }) {
  if (data.customers.length === 0) {
    return <p className="text-sm text-muted">No paying customers yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted border-b border-border">
            <th className="py-2 pr-4">Email</th>
            <th className="py-2 pr-4">Plan</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Since</th>
            <th className="py-2 pr-4">Account</th>
          </tr>
        </thead>
        <tbody>
          {data.customers.map((c) => (
            <tr key={c.email} className="border-b border-border/50">
              <td className="py-2 pr-4">{c.email}</td>
              <td className="py-2 pr-4">{c.plan ?? "—"}</td>
              <td className="py-2 pr-4">{c.status ?? "—"}</td>
              <td className="py-2 pr-4 whitespace-nowrap">
                {c.since?.slice(0, 10) ?? "—"}
              </td>
              <td className="py-2 pr-4">{c.hasAccount ? "yes" : "pay-first"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeeklyReportPanel({ data }: { data: AdminMetricsResponse }) {
  const report = data.latestReport;
  if (!report) {
    return (
      <p className="text-sm text-muted">
        No weekly report yet — the first one is written by the weekly job.
      </p>
    );
  }
  return (
    <div className="border border-border rounded p-4">
      <p className="text-xs uppercase tracking-widest text-muted">
        Week {report.week}
      </p>
      <p className="mt-2 text-sm">{report.summary}</p>
      {report.recommendations.length > 0 && (
        <ul className="mt-3 space-y-2">
          {report.recommendations.map((rec, i) => (
            <li key={i} className="text-sm">
              <span className="text-xs uppercase tracking-wider text-accent mr-2">
                {rec.area}
              </span>
              {rec.change}
              <span className="block text-xs text-muted mt-0.5">
                {rec.rationale}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted">
        Apply with{" "}
        <code className="text-accent">
          npx tsx scripts/apply-recommendations.ts {report.week}
        </code>
      </p>
    </div>
  );
}

export default function AdminPage() {
  const { user, loading, signIn, getIdToken } = useAuth();
  const [data, setData] = useState<AdminMetricsResponse | null>(null);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      const token = await getIdToken();
      if (cancelled) return;
      if (!token) {
        setState("error");
        return;
      }
      const res = await fetch("/api/admin/metrics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (!res.ok) {
        setState("error");
        return;
      }
      const json = (await res.json()) as AdminMetricsResponse;
      if (cancelled) return;
      setData(json);
      setState("ready");
    })().catch(() => {
      if (!cancelled) setState("error");
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, getIdToken, reloadKey]);

  const latestFollowers = data?.daily
    .map((d) => d.account?.followerCount)
    .filter((v): v is number => typeof v === "number")
    .at(-1);
  const last7 = (data?.daily ?? []).slice(-7);
  const weekSignups = last7.reduce((s, d) => s + (d.signups ?? 0), 0);

  return (
    <div className="flex flex-col flex-1">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            The Long View
          </Link>
          <span className="text-xs uppercase tracking-widest text-muted">
            Admin
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full">
        {loading && <p className="text-muted">Checking access…</p>}

        {!loading && !user && (
          <div className="py-16 text-center">
            <p className="text-muted mb-4">Sign in to view the dashboard.</p>
            <button
              onClick={() => signIn()}
              className="bg-accent text-white font-semibold px-4 py-2 rounded hover:opacity-90 transition-opacity"
            >
              Sign in with Google
            </button>
          </div>
        )}

        {!loading && user && !isAdmin && (
          <p className="py-16 text-center text-muted">
            {user.email} is not authorized for this dashboard.
          </p>
        )}

        {isAdmin && state === "loading" && (
          <p className="text-muted">Loading metrics…</p>
        )}

        {isAdmin && state === "error" && (
          <div className="text-muted">
            <p>Could not load metrics.</p>
            <button
              onClick={() => {
                setState("loading");
                setReloadKey((k) => k + 1);
              }}
              className="mt-3 text-accent underline text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {isAdmin && state === "ready" && data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Followers" value={fmt(latestFollowers)} />
              <StatCard
                label="Email subscribers"
                value={fmt(data.totals.subscribers)}
              />
              <StatCard label="Customers" value={fmt(data.totals.customers)} />
              <StatCard label="Signups (7d)" value={fmt(weekSignups)} />
            </div>

            <SectionTitle>Follower trend</SectionTitle>
            <FollowerTrend daily={data.daily} />

            <SectionTitle>Daily</SectionTitle>
            <DailyTable daily={data.daily} />

            <SectionTitle>Top reels</SectionTitle>
            <ReelLeaderboard reels={data.reels} />

            <SectionTitle>Customers</SectionTitle>
            <CustomerTable data={data} />

            <SectionTitle>Latest weekly report</SectionTitle>
            <WeeklyReportPanel data={data} />
          </>
        )}
      </main>
    </div>
  );
}
