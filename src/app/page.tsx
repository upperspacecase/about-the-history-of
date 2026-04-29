"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { SignInButton } from "@/components/sign-in-button";
import { CATEGORIES, type Category } from "@/lib/categories";

interface Headline {
  title: string;
  link: string;
  source: string;
  category: string;
  pubDate: string;
  snippet: string;
  image?: string;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
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

export default function Home() {
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "All">("All");
  const [activeSource, setActiveSource] = useState<string>("All");

  useEffect(() => {
    fetch("/api/headlines")
      .then((res) => res.json())
      .then((data) => {
        setHeadlines(data.headlines || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load headlines");
        setLoading(false);
      });
  }, []);

  const sources = useMemo(() => {
    const set = new Set<string>();
    for (const h of headlines) if (h.source) set.add(h.source);
    return Array.from(set).sort();
  }, [headlines]);

  const filtered = useMemo(
    () =>
      headlines.filter((h) => {
        if (activeCategory !== "All" && h.category !== activeCategory) return false;
        if (activeSource !== "All" && h.source !== activeSource) return false;
        return true;
      }),
    [headlines, activeCategory, activeSource]
  );

  const lead = filtered[0];
  const secondary = filtered.slice(1, 4);
  const rest = filtered.slice(4);

  return (
    <div className="flex flex-col flex-1">
      {/* Masthead */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 pt-6 pb-4 relative">
          <div className="absolute right-6 top-6">
            <SignInButton />
          </div>
          <div className="text-center">
            <p className="text-xs tracking-widest uppercase text-muted mb-2">
              {todayFormatted()}
            </p>
            <h1
              className="text-4xl sm:text-5xl font-bold tracking-tight mb-1"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              About the History of...
            </h1>
            <p className="text-sm text-muted">
              Today&apos;s headlines. The history behind them.
            </p>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="max-w-6xl mx-auto px-6 py-2 flex gap-6 text-xs font-medium uppercase tracking-wider overflow-x-auto">
            {(["All", ...CATEGORIES] as const).map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={
                    isActive
                      ? "text-accent border-b-2 border-accent pb-1 -mb-[9px] cursor-pointer"
                      : "text-muted hover:text-accent transition-colors cursor-pointer"
                  }
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
        {sources.length > 0 && (
          <div className="border-t border-border bg-card/40">
            <div className="max-w-6xl mx-auto px-6 py-2 flex gap-4 items-center text-[11px] tracking-wider overflow-x-auto">
              <span className="uppercase text-muted shrink-0">Source</span>
              {(["All", ...sources] as const).map((src) => {
                const isActive = activeSource === src;
                return (
                  <button
                    key={src}
                    onClick={() => setActiveSource(src)}
                    className={
                      isActive
                        ? "px-2 py-0.5 rounded-full border border-accent text-accent cursor-pointer shrink-0"
                        : "px-2 py-0.5 rounded-full border border-border text-muted hover:text-accent hover:border-accent/40 transition-colors cursor-pointer shrink-0"
                    }
                  >
                    {src}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full">
        {loading && (
          <div className="space-y-6 py-12">
            {[...Array(5)].map((_, i) => (
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

        {error && (
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

        {!loading && !error && headlines.length > 0 && filtered.length === 0 && (
          <div className="py-12 text-center text-muted">
            <p>No headlines match this filter.</p>
            <button
              onClick={() => {
                setActiveCategory("All");
                setActiveSource("All");
              }}
              className="mt-3 text-accent underline text-sm"
            >
              Reset filters
            </button>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            {/* Lead story + secondary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8 border-b border-border">
              {/* Lead */}
              {lead && (
                <div className="lg:col-span-2">
                  <Link
                    href={`/history?headline=${toSlug(lead.title)}&source=${encodeURIComponent(lead.source)}&link=${encodeURIComponent(lead.link)}`}
                    className="group block"
                  >
                    {lead.image && (
                      <div className="mb-4 aspect-[16/9] w-full overflow-hidden rounded-md bg-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={lead.image}
                          alt=""
                          loading="eager"
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />
                      </div>
                    )}
                    <span className="text-xs font-medium uppercase tracking-wider text-accent">
                      {lead.source} / {lead.category}
                    </span>
                    <h2
                      className="text-3xl sm:text-4xl font-bold leading-tight mt-2 mb-3 group-hover:text-accent transition-colors"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {lead.title}
                    </h2>
                    {lead.snippet && (
                      <p className="text-muted leading-relaxed text-lg">
                        {lead.snippet}
                      </p>
                    )}
                    <p className="mt-3 text-sm text-accent font-medium">
                      Read the history &rarr;
                    </p>
                  </Link>
                </div>
              )}

              {/* Secondary stories */}
              <div className="space-y-6 lg:border-l lg:border-border lg:pl-8">
                {secondary.map((h, i) => (
                  <div
                    key={i}
                    className={
                      i < secondary.length - 1
                        ? "pb-6 border-b border-border"
                        : ""
                    }
                  >
                    <Link
                      href={`/history?headline=${toSlug(h.title)}&source=${encodeURIComponent(h.source)}&link=${encodeURIComponent(h.link)}`}
                      className="group flex gap-3 items-start"
                    >
                      {h.image && (
                        <div className="shrink-0 w-20 h-20 overflow-hidden rounded bg-border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={h.image}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted">
                          {h.source}
                        </span>
                        <h3
                          className="text-lg font-semibold leading-snug mt-1 group-hover:text-accent transition-colors"
                          style={{ fontFamily: "var(--font-serif)" }}
                        >
                          {h.title}
                        </h3>
                        <p className="mt-1 text-xs text-muted">
                          {formatDate(h.pubDate)}
                        </p>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Remaining headlines */}
            {rest.length > 0 && (
              <div className="pt-8">
                <h2 className="text-xs font-medium uppercase tracking-widest text-muted mb-6">
                  More Headlines
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                  {rest.map((h, i) => (
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
                      <span className="text-xs font-medium uppercase tracking-wider text-muted">
                        {h.source}
                      </span>
                      <h3
                        className="text-base font-semibold leading-snug mt-1 group-hover:text-accent transition-colors"
                        style={{ fontFamily: "var(--font-serif)" }}
                      >
                        {h.title}
                      </h3>
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
              </div>
            )}
          </>
        )}

        {!loading && !error && headlines.length === 0 && (
          <div className="py-12 text-center text-muted">
            <p>No headlines available right now.</p>
          </div>
        )}
      </main>

      {/* Footer */}
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
        </div>
      </footer>
    </div>
  );
}
