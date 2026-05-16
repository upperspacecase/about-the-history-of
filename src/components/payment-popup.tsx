"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-context";

interface PaymentPopupProps {
  foundersRemaining: number | null;
  dateLabel: string;
  onClaimed: () => void;
}

type Plan = "yearly" | "monthly";

const PRINCIPLES = [
  {
    n: "1",
    title: "History doesn’t repeat but it does rhyme.",
    body: "Every crisis has a precedent. The precedent usually hints at how this one ends.",
  },
  {
    n: "2",
    title: "Remember, there is no finish line.",
    body: "Every era thinks it’s the last act. None has been.",
  },
  {
    n: "3",
    title: "Find signal in the noise.",
    body: "Headlines describe. History explains.",
  },
];

export function PaymentPopup({
  foundersRemaining,
  dateLabel,
  onClaimed,
}: PaymentPopupProps) {
  const { user, signIn, getIdToken } = useAuth();
  const [plan, setPlan] = useState<Plan>("yearly");
  const [inviterEmail, setInviterEmail] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState("");

  const slotsLeft =
    foundersRemaining === null ? null : Math.max(0, foundersRemaining);
  const slotsExhausted = slotsLeft !== null && slotsLeft <= 0;
  const price = plan === "yearly" ? "£34" : "£5";
  const period = plan === "yearly" ? "/yr" : "/mo";

  async function ensureSignedIn(): Promise<string | null> {
    if (!user) {
      try {
        await signIn();
      } catch {
        return null;
      }
    }
    return await getIdToken();
  }

  async function handleCheckout() {
    if (checkoutLoading) return;
    setError("");
    setCheckoutLoading(true);
    try {
      const token = await ensureSignedIn();
      if (!token) {
        setError("Sign in to subscribe.");
        return;
      }
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start checkout");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Try again.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleClaim(e: FormEvent) {
    e.preventDefault();
    if (claiming) return;
    setError("");
    setClaiming(true);
    try {
      const token = await ensureSignedIn();
      if (!token) {
        setError("Sign in to claim a free year.");
        return;
      }
      const res = await fetch("/api/invite/claim", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inviterEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Could not claim free year");
        return;
      }
      onClaimed();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-5">
          {/* Hero copy + principles + example image */}
          <div className="md:col-span-3 p-6 md:p-8 border-b md:border-b-0 md:border-r border-border">
            <p className="text-xs tracking-widest uppercase text-muted mb-3">
              {dateLabel}
            </p>
            <h2
              id="paywall-title"
              className="text-3xl md:text-4xl font-bold leading-[1.1] tracking-tight"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Today&apos;s Headlines, in Context
            </h2>
            <p className="mt-4 text-sm md:text-base text-muted leading-relaxed">
              The Long View turns major headlines into short historical
              timelines — the precedent, the pattern, and the story beneath the
              story.
            </p>

            <ol className="mt-6 space-y-4">
              {PRINCIPLES.map((p) => (
                <li key={p.n} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="shrink-0 w-8 h-8 rounded bg-highlight border border-border flex items-center justify-center text-base font-semibold"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {p.n}
                  </span>
                  <div>
                    <h3
                      className="text-sm font-semibold mb-0.5"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {p.title}
                    </h3>
                    <p className="text-xs text-muted leading-relaxed">
                      {p.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-6 hidden md:block">
              <Image
                src="/hero-story.png"
                alt="An example Long View story: a major headline alongside its historical timeline, key moments, and why-it-matters context."
                width={962}
                height={1414}
                className="w-full h-auto"
              />
            </div>
          </div>

          {/* Pricing + invite + preview */}
          <div className="md:col-span-2 bg-highlight p-6 md:p-8 flex flex-col">
            <div className="inline-flex rounded-full border border-border bg-card p-1 mb-5 self-start">
              <button
                type="button"
                onClick={() => setPlan("yearly")}
                className={
                  plan === "yearly"
                    ? "px-4 py-1.5 text-xs font-medium uppercase tracking-wider rounded-full bg-accent text-white"
                    : "px-4 py-1.5 text-xs font-medium uppercase tracking-wider rounded-full text-muted hover:text-foreground transition-colors cursor-pointer"
                }
              >
                Yearly
              </button>
              <button
                type="button"
                onClick={() => setPlan("monthly")}
                className={
                  plan === "monthly"
                    ? "px-4 py-1.5 text-xs font-medium uppercase tracking-wider rounded-full bg-accent text-white"
                    : "px-4 py-1.5 text-xs font-medium uppercase tracking-wider rounded-full text-muted hover:text-foreground transition-colors cursor-pointer"
                }
              >
                Monthly
              </button>
            </div>

            <div className="mb-5 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight">{price}</span>
              <span className="text-sm text-muted">{period}</span>
              {plan === "yearly" && (
                <span className="ml-2 text-xs text-accent font-semibold uppercase tracking-wider">
                  Save 43%
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="w-full bg-accent text-white font-semibold py-2.5 rounded hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {checkoutLoading ? "Opening Stripe…" : "Subscribe with Stripe"}
            </button>
            <p className="mt-2 text-xs text-muted">Cancel anytime.</p>

            <div className="flex items-center gap-3 my-5 text-[11px] uppercase tracking-widest text-muted">
              <div className="flex-1 h-px bg-border" />
              <span>or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <p className="text-sm font-semibold mb-1">1 free year by invite</p>
            <p className="text-xs text-muted mb-3">
              {slotsLeft === null
                ? "Limited founder invites available."
                : slotsExhausted
                ? "All 250 founder invites have been claimed."
                : `${slotsLeft} of 250 left.`}
            </p>

            <form onSubmit={handleClaim} className="space-y-2">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Email of the person who invited you"
                value={inviterEmail}
                onChange={(e) => setInviterEmail(e.target.value)}
                disabled={slotsExhausted || claiming}
                required
                className="w-full px-3 py-2 text-sm rounded border border-border bg-card focus:outline-none focus:border-accent disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={slotsExhausted || claiming || !inviterEmail}
                className="w-full text-sm font-medium border border-accent text-accent py-2 rounded hover:bg-accent/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {claiming ? "Claiming…" : "Claim free year"}
              </button>
              {error && (
                <p className="text-xs text-accent" role="alert">
                  {error}
                </p>
              )}
            </form>

            <div className="mt-auto pt-6">
              <Link
                href="/preview"
                className="block text-center text-sm font-medium border border-border text-foreground py-2 rounded hover:border-accent hover:text-accent transition-colors"
              >
                Read up to 3 already re-written stories
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
