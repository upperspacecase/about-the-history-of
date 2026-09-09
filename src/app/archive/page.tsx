"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/site-header";

interface StoryResult {
  slug: string;
  headline: string;
  scope: string;
  topics: string[];
  firstPublishedAt: string;
  latestUpdateAt: string;
}

interface EditionRow {
  id: string;
  status: string;
  storyCount: number;
  readingMinutes: number;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}

export default function ArchivePage() {
  const [tab, setTab] = useState<"stories" | "editions">("stories");

  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cursor, setCursor] = useState("");
  const [results, setResults] = useState<StoryResult[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [prevCursor, setPrevCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastQuery, setLastQuery] = useState("");

  const [editions, setEditions] = useState<EditionRow[] | null>(null);

  const search = useCallback(
    async (cursorValue: string) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (topic) params.set("topic", topic);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (cursorValue) params.set("cursor", cursorValue);
        const res = await fetch(`/api/stories?${params.toString()}`);
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || "search failed");
        }
        const data = (await res.json()) as {
          results: StoryResult[];
          nextCursor: string | null;
          prevCursor: string | null;
        };
        setResults(data.results);
        setNextCursor(data.nextCursor);
        setPrevCursor(data.prevCursor);
        setLastQuery(q);
        setCursor(cursorValue);
      } catch (err) {
        setError(err instanceof Error ? err.message : "search failed");
      } finally {
        setLoading(false);
      }
    },
    [q, topic, from, to]
  );

  useEffect(() => {
    search("");
    // Initial load only; subsequent searches are user-driven.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab !== "editions" || editions !== null) return;
    (async () => {
      try {
        const res = await fetch("/api/briefing?list=1");
        const data = (await res.json()) as { editions: EditionRow[] };
        setEditions(data.editions ?? []);
      } catch {
        setEditions([]);
      }
    })();
  }, [tab, editions]);

  function clearFilters() {
    setQ("");
    setTopic("");
    setFrom("");
    setTo("");
  }

  return (
    <div className="flex flex-col flex-1">
      <SiteHeader compact />
      <main className="flex-1 max-w-3xl mx-auto px-6 py-8 w-full">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Explore the background
        </h1>
        <p className="text-muted text-sm mt-1">
          Search the stories we&apos;ve covered, or revisit a past briefing.
        </p>

        <div className="mt-6 flex gap-6 text-sm font-medium border-b border-border">
          <button
            type="button"
            onClick={() => setTab("stories")}
            className={
              tab === "stories"
                ? "pb-2 border-b-2 border-accent text-accent cursor-pointer"
                : "pb-2 text-muted hover:text-accent cursor-pointer"
            }
          >
            Stories
          </button>
          <button
            type="button"
            onClick={() => setTab("editions")}
            className={
              tab === "editions"
                ? "pb-2 border-b-2 border-accent text-accent cursor-pointer"
                : "pb-2 text-muted hover:text-accent cursor-pointer"
            }
          >
            Daily briefings
          </button>
        </div>

        {tab === "stories" && (
          <>
            <form
              className="mt-6 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                search("");
              }}
            >
              <div>
                <label htmlFor="archive-q" className="block text-xs text-muted mb-1">
                  Search stories
                </label>
                <input
                  id="archive-q"
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="A topic, person, place or event"
                  className="w-full border border-border rounded px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label htmlFor="archive-topic" className="block text-xs text-muted mb-1">
                    Topic
                  </label>
                  <input
                    id="archive-topic"
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="border border-border rounded px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-accent w-36"
                  />
                </div>
                <div>
                  <label htmlFor="archive-from" className="block text-xs text-muted mb-1">
                    Updated from
                  </label>
                  <input
                    id="archive-from"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="border border-border rounded px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label htmlFor="archive-to" className="block text-xs text-muted mb-1">
                    Updated to
                  </label>
                  <input
                    id="archive-to"
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="border border-border rounded px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-accent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
                >
                  {loading ? "Searching…" : "Search"}
                </button>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm text-muted hover:text-accent underline cursor-pointer"
                >
                  Clear filters
                </button>
              </div>
            </form>

            {error && (
              <p className="mt-6 text-sm text-red-600">
                We couldn&apos;t run the search. Please try again.
              </p>
            )}

            {results !== null && !error && (
              <div className="mt-6">
                {results.length === 0 ? (
                  <p className="text-sm text-muted">
                    {lastQuery
                      ? `No published stories match "${lastQuery}". Try a broader term or clear the filters.`
                      : "No published stories yet."}
                  </p>
                ) : (
                  <ul className="space-y-5">
                    {results.map((r) => (
                      <li key={r.slug} className="border-b border-border pb-5">
                        <Link
                          href={`/story/${r.slug}`}
                          className="text-lg font-semibold hover:text-accent transition-colors"
                          style={{ fontFamily: "var(--font-serif)" }}
                        >
                          {r.headline}
                        </Link>
                        <p className="text-xs text-muted mt-1">
                          First covered {formatDate(r.firstPublishedAt)} ·
                          Updated {formatDate(r.latestUpdateAt)}
                          {r.topics.length > 0 && <> · {r.topics.join(", ")}</>}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-6 flex gap-4 text-sm">
                  {prevCursor !== null && (
                    <button
                      type="button"
                      onClick={() => search(prevCursor)}
                      className="text-accent hover:underline cursor-pointer"
                    >
                      Previous results
                    </button>
                  )}
                  {nextCursor !== null && (
                    <button
                      type="button"
                      onClick={() => search(nextCursor)}
                      className="text-accent hover:underline cursor-pointer"
                    >
                      Next results
                    </button>
                  )}
                  {cursor !== "" && prevCursor === null && null}
                </div>
              </div>
            )}
          </>
        )}

        {tab === "editions" && (
          <div className="mt-6">
            {editions === null ? (
              <p className="text-sm text-muted">Loading the briefing index…</p>
            ) : editions.length === 0 ? (
              <p className="text-sm text-muted">No published briefings yet.</p>
            ) : (
              <ul className="space-y-3">
                {editions.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/briefing/${e.id}`}
                      className="text-[15px] font-medium hover:text-accent transition-colors"
                    >
                      {formatDate(`${e.id}T12:00:00Z`)}
                    </Link>
                    <span className="text-xs text-muted">
                      {" "}·{" "}
                      {e.status === "quiet"
                        ? "No substantial updates"
                        : `${e.storyCount} ${e.storyCount === 1 ? "story" : "stories"} · About ${e.readingMinutes} min`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
