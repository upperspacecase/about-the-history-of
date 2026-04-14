"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

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
  timeline: TimelineEvent[];
  patterns: Pattern[];
  furtherReading: FurtherReading[];
  whyItMattersNow: string;
}

function HistoryContent() {
  const searchParams = useSearchParams();
  const headline = searchParams.get("headline") || "";
  const source = searchParams.get("source") || "";
  const originalLink = searchParams.get("link") || "";

  const [result, setResult] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!headline) {
      setError("No headline provided");
      setLoading(false);
      return;
    }

    fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headline }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || data.error || "Failed to load history");
        }
        return data;
      })
      .then((data) => {
        setResult(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
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
            About the History of...
          </span>
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
          <h1
            className="text-3xl sm:text-4xl font-bold leading-tight mt-2"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {headline}
          </h1>
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
        {loading && (
          <div className="space-y-8 py-8">
            <div className="space-y-3">
              <div
                className="h-6 bg-border rounded animate-pulse-bar"
                style={{ width: "60%" }}
              />
              <div
                className="h-4 bg-border/60 rounded animate-pulse-bar"
                style={{ width: "90%", animationDelay: "0.1s" }}
              />
              <div
                className="h-4 bg-border/60 rounded animate-pulse-bar"
                style={{ width: "75%", animationDelay: "0.2s" }}
              />
            </div>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div
                    className="w-16 h-4 bg-border rounded animate-pulse-bar"
                    style={{ animationDelay: `${0.3 + i * 0.15}s` }}
                  />
                  <div className="flex-1 space-y-2">
                    <div
                      className="h-4 bg-border rounded animate-pulse-bar"
                      style={{ width: "70%", animationDelay: `${0.4 + i * 0.15}s` }}
                    />
                    <div
                      className="h-3 bg-border/60 rounded animate-pulse-bar"
                      style={{ width: "50%", animationDelay: `${0.5 + i * 0.15}s` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-muted pt-4">
              Researching the historical record...
            </p>
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
                    <div className="absolute -left-[33px] top-0.5 w-4 h-4 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center">
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
