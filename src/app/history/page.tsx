"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-context";
import { SignInButton } from "@/components/sign-in-button";
import { SignificanceDots } from "@/components/significance-dots";

interface TimelineEvent {
  year: string;
  title: string;
  description: string;
  link: string;
}

interface Pattern {
  title: string;
  description: string;
}

interface FurtherReading {
  title: string;
  author: string;
  type: string;
  link: string;
}

interface HistoryResponse {
  topic: string;
  summary: string;
  truthHeadline?: string;
  significance?: number;
  significanceReason?: string;
  timeline: TimelineEvent[];
  patterns: Pattern[];
  furtherReading: FurtherReading[];
  whyItMattersNow: string;
}

const GENERATION_STAGES = [
  "Searching the archive…",
  "Tracing the timeline…",
  "Identifying recurring patterns…",
  "Scoring its place in history…",
  "Writing the truth headline…",
];

function HistoryContent() {
  const searchParams = useSearchParams();
  const headline = searchParams.get("headline") || "";
  const source = searchParams.get("source") || "";
  const originalLink = searchParams.get("link") || "";

  const { user, loading: authLoading, signIn, getIdToken } = useAuth();

  const [result, setResult] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [error, setError] = useState("");
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (!generating) return;
    setStageIndex(0);
    const interval = setInterval(() => {
      setStageIndex((s) => (s + 1) % GENERATION_STAGES.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [generating]);

  const generate = useCallback(async () => {
    setError("");
    setGenerating(true);
    try {
      const token = await getIdToken();
      if (!token) {
        setNeedsSignIn(true);
        return;
      }
      const res = await fetch("/api/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ headline }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || "Failed to load history");
      }
      setResult(data);
      setNeedsSignIn(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }, [headline, getIdToken]);

  useEffect(() => {
    if (!headline) {
      setError("No headline provided");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/history?headline=${encodeURIComponent(headline)}`
        );
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setResult(data);
        } else if (res.status === 404) {
          setNeedsSignIn(true);
        } else {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load history");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [headline]);

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-muted hover:text-accent transition-colors flex items-center gap-1"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            All Headlines
          </Link>
          <div className="h-4 w-px bg-border" />
          <span
            className="text-sm font-medium"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            The Long View
          </span>
          <div className="ml-auto">
            <SignInButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-8 w-full">
        {/* Headline */}
        <div className="mb-10 pb-8 border-b border-border">
          {source && (
            <span className="text-xs font-medium uppercase tracking-wider text-accent">
              {source}
            </span>
          )}
          {result?.truthHeadline ? (
            <div className="mt-2 space-y-2">
              <h1
                className="text-3xl sm:text-4xl font-bold leading-tight line-through text-muted decoration-muted/60"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {headline}
              </h1>
              <h1
                className="text-3xl sm:text-4xl font-bold leading-tight text-green-700 dark:text-green-500"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {result.truthHeadline}
              </h1>
            </div>
          ) : (
            <h1
              className="text-3xl sm:text-4xl font-bold leading-tight mt-2"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {headline}
            </h1>
          )}
          {typeof result?.significance === "number" && (
            <div className="mt-5 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="text-[11px] uppercase tracking-widest text-muted">
                  Historical significance
                </span>
                <SignificanceDots
                  score={result.significance}
                  reason={result.significanceReason}
                  size="lg"
                />
                <span className="text-xs font-mono text-muted">
                  {result.significance}/10
                </span>
              </div>
              {result.significanceReason && (
                <p className="text-sm text-muted leading-snug max-w-2xl">
                  {result.significanceReason}
                </p>
              )}
            </div>
          )}
          {originalLink && (
            <a
              href={originalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-sm text-muted hover:text-accent transition-colors"
            >
              Read original article
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
              </svg>
            </a>
          )}
        </div>

        {/* Loading */}
        {(loading || generating) && (
          <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
            <div
              className="h-10 w-10 rounded-full border-2 border-border border-t-accent animate-spin"
              role="status"
              aria-label="Loading"
            />
            <p
              key={generating ? stageIndex : "checking"}
              className="text-sm text-muted animate-fade-in"
            >
              {generating
                ? GENERATION_STAGES[stageIndex]
                : "Checking the archive…"}
            </p>
            {generating && (
              <p className="text-xs text-muted/70 max-w-sm">
                This usually takes 1–2 minutes. The result is saved so the
                next reader sees it instantly.
              </p>
            )}
          </div>
        )}
        {/* Sign-in / generate prompt */}
        {!loading && !generating && !result && needsSignIn && !error && (
          <div className="py-12 text-center max-w-md mx-auto">
            <h2
              className="text-2xl font-bold mb-3"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              No history written yet
            </h2>
            <p className="text-muted mb-6 leading-relaxed">
              Be the first to commission the historical context for this
              headline. Once written, it&apos;s saved for everyone to read.
            </p>
            {authLoading ? (
              <div className="h-10 w-40 mx-auto bg-border/50 rounded animate-pulse-bar" />
            ) : user ? (
              <button
                onClick={generate}
                className="px-5 py-2.5 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Write the history
              </button>
            ) : (
              <button
                onClick={() => signIn()}
                className="px-5 py-2.5 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Sign in with Google to generate
              </button>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="py-12 text-center">
            <p className="text-muted mb-4">{error}</p>
            <Link href="/" className="text-accent underline text-sm">
              Back to headlines
            </Link>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="animate-fade-in space-y-12">
            {/* Topic & Summary */}
            <section>
              <h2
                className="text-2xl font-bold tracking-tight mb-3"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {result.topic}
              </h2>
              <p className="text-lg text-muted leading-relaxed">
                {result.summary}
              </p>
            </section>

            {/* Timeline */}
            <section>
              <h3 className="text-xs font-medium uppercase tracking-widest text-muted mb-8">
                Key Moments in History
              </h3>
              <div className="relative pl-8 border-l-2 border-border space-y-8">
                {result.timeline.map((event, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[41px] top-0.5 w-4 h-4 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    </div>
                    <div className="text-sm font-mono text-accent font-medium">
                      {event.year}
                    </div>
                    <h4
                      className="font-semibold mt-0.5 mb-1"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {event.title}
                    </h4>
                    <p className="text-muted text-sm leading-relaxed">
                      {event.description}
                    </p>
                    {event.link && (
                      <a
                        href={event.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-accent mt-1 hover:underline"
                      >
                        Learn more
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                        </svg>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Patterns */}
            <section>
              <h3 className="text-xs font-medium uppercase tracking-widest text-muted mb-6">
                Recurring Patterns
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.patterns.map((pattern, i) => (
                  <div
                    key={i}
                    className="p-5 rounded-lg border border-border bg-card"
                  >
                    <h4
                      className="font-semibold mb-2"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {pattern.title}
                    </h4>
                    <p className="text-sm text-muted leading-relaxed">
                      {pattern.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Why It Matters Now */}
            <section className="p-6 rounded-lg border border-accent/20 bg-highlight">
              <h3 className="text-xs font-medium uppercase tracking-widest text-accent mb-3">
                Why This Matters Now
              </h3>
              <p
                className="text-lg leading-relaxed"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {result.whyItMattersNow}
              </p>
            </section>

            {/* Further Reading */}
            {result.furtherReading && result.furtherReading.length > 0 && (
              <section>
                <h3 className="text-xs font-medium uppercase tracking-widest text-muted mb-6">
                  Further Reading
                </h3>
                <div className="space-y-3">
                  {result.furtherReading.map((item, i) => (
                    <a
                      key={i}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-4 p-4 rounded-lg border border-border hover:border-accent/40 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                        {item.type === "book" && (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-accent"
                          >
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                          </svg>
                        )}
                        {item.type === "documentary" && (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-accent"
                          >
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        )}
                        {item.type === "article" && (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-accent"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="font-medium group-hover:text-accent transition-colors">
                          {item.title}
                        </div>
                        <div className="text-sm text-muted">
                          {item.author} &middot;{" "}
                          <span className="capitalize">{item.type}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Back link */}
            <div className="pt-4 border-t border-border">
              <Link
                href="/"
                className="text-sm text-accent hover:underline flex items-center gap-1"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to all headlines
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center text-xs text-muted">
          Historical analysis powered by Claude. Links to Wikipedia and public
          sources.
        </div>
      </footer>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen text-muted">
          Loading...
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}
