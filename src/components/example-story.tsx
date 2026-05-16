"use client";

import { useEffect, useState } from "react";
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

export function ExampleStory() {
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
          throw new Error(data.error || "Failed to load example");
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div
          className="h-8 w-8 rounded-full border-2 border-border border-t-accent animate-spin"
          role="status"
          aria-label="Loading"
        />
        <p className="text-xs text-muted">Loading example…</p>
      </div>
    );
  }

  if (error || !result) {
    return null;
  }

  return (
    <article className="text-foreground">
      <p className="text-[11px] tracking-[0.18em] uppercase font-semibold text-accent mb-4">
        Today’s Long View
      </p>

      <div className="space-y-2">
        <h3
          className="text-xl md:text-2xl font-bold leading-[1.15] tracking-tight line-through text-muted decoration-muted/60"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {PREVIEW_HEADLINE}
        </h3>
        {result.truthHeadline && (
          <h3
            className="text-xl md:text-2xl font-bold leading-[1.15] tracking-tight text-green-700 dark:text-green-500"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {result.truthHeadline}
          </h3>
        )}
      </div>

      {typeof result.significance === "number" && (
        <div className="mt-5 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted">
              Historical Significance
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
            <p className="text-sm text-muted leading-snug">
              {result.significanceReason}
            </p>
          )}
        </div>
      )}

      <hr className="my-6 border-border" />

      {/* Topic & Summary */}
      <h4
        className="text-lg md:text-xl font-bold tracking-tight mb-2"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {result.topic}
      </h4>
      <p className="text-sm md:text-base text-foreground/90 leading-relaxed">
        {result.summary}
      </p>

      <hr className="my-6 border-border" />

      {/* Timeline */}
      <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted mb-6">
        Key Moments in History
      </p>
      <div className="relative pl-7 border-l-2 border-border space-y-6">
        {result.timeline.map((event, i) => (
          <div key={i} className="relative">
            <div className="absolute -left-[33px] top-0.5 w-4 h-4 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            </div>
            <div className="text-xs font-mono text-accent font-medium">
              {event.year}
            </div>
            <h5
              className="text-sm font-semibold mt-0.5 mb-1"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {event.title}
            </h5>
            <p className="text-xs text-foreground/85 leading-relaxed">
              {event.description}
            </p>
            {event.link && (
              <a
                href={event.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-accent mt-1 hover:underline"
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

      {/* Patterns */}
      {result.patterns?.length > 0 && (
        <>
          <hr className="my-6 border-border" />
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted mb-5">
            Recurring Patterns
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.patterns.map((pattern, i) => (
              <div
                key={i}
                className="p-4 rounded-lg border border-border bg-card"
              >
                <h5
                  className="text-sm font-semibold mb-1.5"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {pattern.title}
                </h5>
                <p className="text-xs text-muted leading-relaxed">
                  {pattern.description}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Why It Matters Now */}
      {result.whyItMattersNow && (
        <div className="mt-6 rounded-md border border-accent/40 bg-accent/5 p-4">
          <div className="flex items-start gap-2">
            <svg
              width="16"
              height="16"
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
              <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-accent mb-1">
                Why This Matters Now
              </p>
              <p className="text-xs text-foreground/85 leading-relaxed">
                {result.whyItMattersNow}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Further Reading */}
      {result.furtherReading?.length > 0 && (
        <>
          <hr className="my-6 border-border" />
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted mb-3">
            Further Reading
          </p>
          <ul className="space-y-2">
            {result.furtherReading.map((item, i) => (
              <li key={i}>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-wrap items-baseline gap-x-2 text-xs hover:text-accent transition-colors"
                >
                  <span
                    className="font-semibold"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {item.title}
                  </span>
                  <span className="text-muted">— {item.author}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted">
                    {item.type}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}
