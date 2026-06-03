"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { SignInButton } from "@/components/sign-in-button";
import { SignificanceDots } from "@/components/significance-dots";

interface Headline {
  title: string;
  link: string;
  source: string;
  category: string;
  pubDate: string;
  snippet: string;
  image?: string;
  truthHeadline?: string;
  significance?: number;
  significanceReason?: string;
  hasHistory?: boolean;
}

function toSlug(title: string) {
  return encodeURIComponent(title);
}

function todayFormatted() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function pickRandom<T>(items: T[], n: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export default function PreviewPage() {
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/headlines")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setHeadlines(data.headlines || []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Failed to load headlines");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sample = useMemo(() => {
    const rewritten = headlines.filter((h) => !!h.truthHeadline);
    return pickRandom(rewritten, 3);
  }, [headlines]);

  const [email, setEmail] = useState("");
  const [subStatus, setSubStatus] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");

  async function handleSubscribe(e: FormEvent) {
    e.preventDefault();
    if (subStatus === "loading") return;
    setSubStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubStatus(res.ok ? "done" : "error");
    } catch {
      setSubStatus("error");
    }
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Masthead */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 pt-6 pb-4 relative">
          <div className="hidden sm:block absolute right-6 top-6">
            <SignInButton />
          </div>
          <div className="text-center">
            <p className="text-xs tracking-widest uppercase text-muted mb-2">
              {todayFormatted()}
            </p>
            <Link
              href="/"
              className="inline-block hover:opacity-90 transition-opacity"
            >
              <h1
                className="text-4xl sm:text-5xl font-bold tracking-tight mb-1"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                The Long View
              </h1>
            </Link>
            <p className="text-sm text-muted">
              Today&apos;s headlines. The history behind them.
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full">
        <p className="text-xs font-medium uppercase tracking-widest text-muted mb-8">
          A free preview
        </p>

        {loading && (
          <div className="space-y-6 py-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div
                  className="h-5 bg-border rounded animate-pulse-bar"
                  style={{ width: `${70 - i * 8}%` }}
                />
                <div
                  className="h-3 bg-border/60 rounded animate-pulse-bar"
                  style={{
                    width: `${50 - i * 5}%`,
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="py-12 text-center text-muted">
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 text-accent underline text-sm"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && sample.length === 0 && (
          <div className="py-12 text-center text-muted">
            <p>No re-written stories are ready yet today.</p>
            <Link
              href="/"
              className="mt-3 inline-block text-accent underline text-sm"
            >
              Back to home
            </Link>
          </div>
        )}

        {!loading && !error && sample.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            {sample.map((h, i) => (
              <Link
                key={i}
                href={`/history?headline=${toSlug(h.title)}&source=${encodeURIComponent(h.source)}&link=${encodeURIComponent(h.link)}`}
                className="group block pb-6 border-b border-border"
              >
                {h.image && (
                  <div className="mb-2 aspect-[16/9] w-full overflow-hidden rounded bg-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={h.image}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted">
                    {h.source} / {h.category}
                  </span>
                  {typeof h.significance === "number" && (
                    <SignificanceDots
                      score={h.significance}
                      reason={h.significanceReason}
                    />
                  )}
                </div>
                {h.truthHeadline ? (
                  <div className="mt-1 space-y-1">
                    <h3
                      className="text-base font-semibold leading-snug line-through text-muted decoration-muted/60"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {h.title}
                    </h3>
                    <h3
                      className="text-base font-semibold leading-snug text-green-700 dark:text-green-500"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {h.truthHeadline}
                    </h3>
                  </div>
                ) : (
                  <h3
                    className="text-base font-semibold leading-snug mt-1 group-hover:text-accent transition-colors"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {h.title}
                  </h3>
                )}
                {h.snippet && (
                  <p className="text-muted text-sm mt-1 line-clamp-2">
                    {h.snippet}
                  </p>
                )}
                <p className="mt-2 text-xs text-accent font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Read the history &rarr;
                </p>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-12 border-t border-border pt-8">
          {subStatus === "done" ? (
            <p
              className="text-base text-green-700 dark:text-green-500"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              You&apos;re on the list. Tomorrow&apos;s Long View lands in your inbox.
            </p>
          ) : (
            <div className="max-w-xl">
              <p
                className="text-base font-semibold"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Get the daily Long View — free.
              </p>
              <p className="text-sm text-muted mt-1 mb-3">
                One headline, the history behind it, each morning. If you&apos;re
                not a student of history, everything feels unprecedented.
              </p>
              <form
                onSubmit={handleSubscribe}
                className="flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 border border-border rounded px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={subStatus === "loading"}
                  className="inline-flex items-center justify-center gap-2 bg-accent text-white font-semibold px-4 py-2 rounded hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {subStatus === "loading" ? "Adding…" : "Get the daily email"}
                </button>
              </form>
              {subStatus === "error" && (
                <p className="text-xs text-red-600 mt-2">
                  Something went wrong. Try again.
                </p>
              )}
              <p className="text-xs text-muted mt-3">
                Want the full archive and timelines?{" "}
                <Link href="/" className="text-accent underline">
                  See subscription options
                </Link>
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-border mt-auto">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center text-sm text-muted">
          <p style={{ fontFamily: "var(--font-serif)" }}>
            &ldquo;History doesn&apos;t repeat itself, but it often
            rhymes.&rdquo;
          </p>
          <p className="mt-2 text-xs">
            Headlines sourced from public RSS feeds. Historical analysis powered
            by Claude.
          </p>
          <p className="mt-3 text-xs flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <Link
              href="/privacy"
              className="hover:text-accent transition-colors"
            >
              Privacy
            </Link>
            <span aria-hidden>·</span>
            <Link
              href="/terms"
              className="hover:text-accent transition-colors"
            >
              Terms
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
