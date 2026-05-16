"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignInButton } from "@/components/sign-in-button";
import { SignificanceDots } from "@/components/significance-dots";

const PREVIEW_HEADLINE =
  "Musk Lawyer’s Question for Sam Altman on the Stand: Are You Trustworthy?";

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
  headline?: string;
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

function todayFormatted() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function PreviewPage() {
  const [result, setResult] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/history?headline=${encodeURIComponent(PREVIEW_HEADLINE)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load the preview");
        }
        const data = (await res.json()) as HistoryResponse;
        if (!cancelled) {
          setResult(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

      <main className="flex-1 max-w-4xl mx-auto px-6 py-10 w-full">
        <p className="text-xs font-medium uppercase tracking-widest text-muted mb-6">
          A free preview
        </p>

        {/* Headline block — original on top (strikethrough), rewritten below */}
        <div className="mb-8 pb-8 border-b border-border space-y-2">
          <h2
            className="text-3xl sm:text-4xl font-bold leading-[1.1] tracking-tight line-through text-muted decoration-muted/60"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {PREVIEW_HEADLINE}
          </h2>
          {result?.truthHeadline && (
            <h2
              className="text-3xl sm:text-4xl font-bold leading-[1.1] tracking-tight text-green-700 dark:text-green-500"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {result.truthHeadline}
            </h2>
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
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
            <div
              className="h-10 w-10 rounded-full border-2 border-border border-t-accent animate-spin"
              role="status"
              aria-label="Loading"
            />
            <p className="text-sm text-muted">Loading the preview…</p>
          </div>
        )}

        {error && !loading && (
          <div className="py-12 text-center">
            <p className="text-muted mb-4">{error}</p>
            <Link href="/" className="text-accent underline text-sm">
              Back to headlines
            </Link>
          </div>
        )}

        {result && !loading && (
          <div className="animate-fade-in space-y-12">
            {/* Topic & Summary */}
            <section>
              <h3
                className="text-2xl font-bold tracking-tight mb-3"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {result.topic}
              </h3>
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
            {result.patterns?.length > 0 && (
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
            )}

            {/* Why It Matters Now */}
            {result.whyItMattersNow && (
              <section className="rounded-lg border border-accent/40 bg-accent/5 p-6">
                <div className="flex items-start gap-3">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                    className="shrink-0 mt-0.5 text-accent"
                  >
                    <path
                      d="M12 2l2.39 6.95H22l-6 4.36L18.18 22 12 17.77 5.82 22 8 13.31 2 8.95h7.61z"
                      fill="currentColor"
                    />
                  </svg>
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-accent mb-2">
                      Why This Matters Now
                    </p>
                    <p className="text-sm leading-relaxed">
                      {result.whyItMattersNow}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Further Reading */}
            {result.furtherReading?.length > 0 && (
              <section>
                <h3 className="text-xs font-medium uppercase tracking-widest text-muted mb-6">
                  Further Reading
                </h3>
                <ul className="space-y-3">
                  {result.furtherReading.map((item, i) => (
                    <li key={i}>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-baseline gap-2 text-sm hover:text-accent transition-colors"
                      >
                        <span
                          className="font-semibold"
                          style={{ fontFamily: "var(--font-serif)" }}
                        >
                          {item.title}
                        </span>
                        <span className="text-muted">— {item.author}</span>
                        <span className="text-xs uppercase tracking-wider text-muted">
                          {item.type}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        <div className="mt-16 border-t border-border pt-8 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted">Want every day&apos;s Long View?</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-accent text-white font-semibold px-4 py-2 rounded hover:opacity-90 transition-opacity"
          >
            Subscribe — £5/month
            <span aria-hidden>&rarr;</span>
          </Link>
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
