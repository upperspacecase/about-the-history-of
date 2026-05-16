"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { SignInButton } from "@/components/sign-in-button";
import { SignificanceDots } from "@/components/significance-dots";
import { PaymentPopup } from "@/components/payment-popup";
import { LandingHero } from "@/components/landing-hero";
import { LandingBanner } from "@/components/landing-banner";
import { useAuth } from "@/lib/firebase/auth-context";
import { CATEGORIES, type Category } from "@/lib/categories";

const FREE_HEADLINE_LIMIT = 5;

interface UserStatus {
  isPaying: boolean;
  freeYearActive: boolean;
  freeYearExpiresAt: number | null;
}

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

function todayIso() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatLongDate(iso: string) {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function shiftIso(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function Home() {
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "All">("All");
  const [activeSource, setActiveSource] = useState<string>("All");
  const today = useMemo(() => todayIso(), []);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const isArchive = selectedDate !== today;
  const [foundersRemaining, setFoundersRemaining] = useState<number | null>(
    null
  );
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [popupDismissed, setPopupDismissed] = useState(false);
  const { user, signOut, getIdToken } = useAuth();

  const refreshFounders = useCallback(() => {
    fetch("/api/founders")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.remaining === "number") {
          setFoundersRemaining(data.remaining);
        }
      })
      .catch(() => {
        /* leave null — banner falls back to generic copy */
      });
  }, []);

  useEffect(() => {
    refreshFounders();
  }, [refreshFounders]);

  // Fetch payment status whenever the signed-in user changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        if (!cancelled) {
          setUserStatus(null);
          setPopupDismissed(true);
        }
        return;
      }
      const token = await getIdToken();
      if (!token || cancelled) return;

      // Paywall auto-opens only on the user's first ever sign-in. signIn()
      // sets this flag when Firebase Auth reports creationTime == lastSignInTime.
      let firstSignIn = false;
      try {
        firstSignIn = window.localStorage.getItem("lv_first_signin") === "1";
        if (firstSignIn) window.localStorage.removeItem("lv_first_signin");
      } catch {
        /* storage disabled — keep popup dismissed */
      }
      if (!cancelled) setPopupDismissed(!firstSignIn);

      try {
        const res = await fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as UserStatus;
        if (!cancelled) setUserStatus(data);
      } catch {
        /* leave status null — popup just won't show */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getIdToken]);

  const refreshUserStatus = useCallback(async () => {
    if (!user) return;
    const token = await getIdToken();
    if (!token) return;
    try {
      const res = await fetch("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      setUserStatus((await res.json()) as UserStatus);
    } catch {
      /* ignore */
    }
  }, [user, getIdToken]);

  const hasFullAccess =
    !!userStatus && (userStatus.isPaying || userStatus.freeYearActive);
  const isFreeTier = !!user && !!userStatus && !hasFullAccess;
  const showPaywall = isFreeTier && !popupDismissed;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setHeadlines([]);
    setActiveCategory("All");
    setActiveSource("All");

    const url =
      selectedDate === today
        ? "/api/headlines"
        : `/api/archive?date=${selectedDate}`;

    fetch(url)
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
  }, [selectedDate, today]);

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

  const visible = useMemo(
    () => (isFreeTier ? filtered.slice(0, FREE_HEADLINE_LIMIT) : filtered),
    [filtered, isFreeTier]
  );
  const hiddenCount = filtered.length - visible.length;

  const handleGetStarted = () => {
    document
      .getElementById("headlines")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
            <h1
              className="text-4xl sm:text-5xl font-bold tracking-tight mb-1"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              The Long View
            </h1>
            <p className="text-sm text-muted">
              Today&apos;s headlines. The history behind them.
            </p>
          </div>
        </div>
      </header>

      {!user && <LandingHero dateLabel={todayFormatted()} />}

      {/* Hero + value props (signed in) */}
      {user && (
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <h2
              className="text-4xl sm:text-5xl font-bold leading-[1.1] tracking-tight mb-4"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Headlines through a corrective lens
            </h2>
            <p className="text-lg text-muted leading-relaxed max-w-2xl">
              Pick any headline. Read the history that produced it — the
              timeline, the patterns, the precedent.
            </p>

            <div className="mt-8 rounded-lg overflow-hidden border border-border bg-card shadow-sm">
              <video
                src="/demo.mp4"
                poster="/demo-poster.jpg"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="w-full h-auto block"
              />
            </div>

            <button
              onClick={handleGetStarted}
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
            >
              Read today&apos;s history
              <span aria-hidden>&darr;</span>
            </button>
          </div>

          <aside className="lg:border-l lg:border-border lg:pl-10">
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted mb-5">
              Why be a student of history?
            </h3>
            <ul className="space-y-5">
              <li>
                <p
                  className="text-base font-semibold mb-1"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  History doesn&apos;t repeat but it does rhyme.
                </p>
                <p className="text-sm text-muted leading-relaxed">
                  Every crisis has a precedent. The precedent usually hints at
                  how this one ends.
                </p>
              </li>
              <li>
                <p
                  className="text-base font-semibold mb-1"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Remember, there is no finish line.
                </p>
                <p className="text-sm text-muted leading-relaxed">
                  Every era thinks it&apos;s the last act. None has been.
                </p>
              </li>
              <li>
                <p
                  className="text-base font-semibold mb-1"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Find signal in the noise.
                </p>
                <p className="text-sm text-muted leading-relaxed">
                  Headlines describe. History explains.
                </p>
              </li>
            </ul>

          </aside>
        </div>
      </section>
      )}

      {/* Filters (above headlines) */}
      <div id="headlines" className="border-b border-border bg-background/60 sticky top-0 z-10 backdrop-blur">
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
      </div>

      {/* Content */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-medium uppercase tracking-widest text-muted">
            {isArchive
              ? `Histories written on ${formatLongDate(selectedDate)}`
              : "Today's Headlines"}
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setSelectedDate((d) => shiftIso(d, -1))}
              className="px-2 py-1 rounded border border-border text-muted hover:text-accent hover:border-accent/40 transition-colors cursor-pointer"
              aria-label="Previous day"
            >
              &larr;
            </button>
            <input
              type="date"
              value={selectedDate}
              max={today}
              onChange={(e) => setSelectedDate(e.target.value || today)}
              className="px-2 py-1 rounded border border-border bg-background text-foreground"
            />
            <button
              type="button"
              onClick={() => setSelectedDate((d) => shiftIso(d, 1))}
              disabled={selectedDate >= today}
              className="px-2 py-1 rounded border border-border text-muted hover:text-accent hover:border-accent/40 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-muted disabled:hover:border-border"
              aria-label="Next day"
            >
              &rarr;
            </button>
            {isArchive && (
              <button
                type="button"
                onClick={() => setSelectedDate(today)}
                className="ml-1 px-2 py-1 rounded border border-accent text-accent hover:bg-accent/10 transition-colors cursor-pointer uppercase tracking-wider"
              >
                Today
              </button>
            )}
          </div>
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            {visible.map((h, i) => (
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
                      className="text-base font-semibold leading-snug text-green-700 dark:text-green-500"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {h.truthHeadline}
                    </h3>
                    <p
                      className="text-sm leading-snug line-through text-muted decoration-muted/60"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {h.title}
                    </p>
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

        {!loading && !error && isFreeTier && hiddenCount > 0 && (
          <div className="mt-8 border border-dashed border-border rounded-lg p-6 text-center bg-card">
            <p className="text-sm text-muted mb-3">
              <strong className="text-foreground">{hiddenCount} more</strong>{" "}
              headlines available with a subscription or free-year invite.
            </p>
            <button
              type="button"
              onClick={() => setPopupDismissed(false)}
              className="text-sm font-semibold text-accent hover:underline cursor-pointer"
            >
              See plans &rarr;
            </button>
          </div>
        )}

        {!loading && !error && headlines.length === 0 && (
          <div className="py-12 text-center text-muted">
            {isArchive ? (
              <>
                <p>No histories were written on {formatLongDate(selectedDate)}.</p>
                <button
                  onClick={() => setSelectedDate(today)}
                  className="mt-3 text-accent underline text-sm"
                >
                  Back to today
                </button>
              </>
            ) : (
              <p>No headlines available right now.</p>
            )}
          </div>
        )}
      </main>

      {!user && <LandingBanner />}

      {showPaywall && (
        <PaymentPopup
          foundersRemaining={foundersRemaining}
          onContinueFree={() => setPopupDismissed(true)}
          onClaimed={async () => {
            await refreshUserStatus();
            refreshFounders();
            setPopupDismissed(true);
          }}
        />
      )}

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
            {user && (
              <>
                <span aria-hidden>·</span>
                <button
                  onClick={() => signOut()}
                  className="hover:text-accent transition-colors cursor-pointer"
                >
                  Sign out
                </button>
              </>
            )}
          </p>
        </div>
      </footer>
    </div>
  );
}
