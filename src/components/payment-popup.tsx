"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/firebase/auth-context";

interface PaymentPopupProps {
  foundersRemaining: number | null;
  onContinueFree: () => void;
  onClaimed: () => void;
}

type Plan = "yearly" | "monthly";

export function PaymentPopup({
  foundersRemaining,
  onContinueFree,
  onClaimed,
}: PaymentPopupProps) {
  const { getIdToken } = useAuth();
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

  async function handleCheckout() {
    if (checkoutLoading) return;
    setError("");
    setCheckoutLoading(true);
    try {
      const token = await getIdToken();
      if (!token) {
        setError("Please sign in again.");
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
      const token = await getIdToken();
      if (!token) {
        setError("Please sign in again.");
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
      <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-5">
          {/* Pricing — top on mobile, right on desktop */}
          <div className="order-1 md:order-2 md:col-span-3 bg-highlight p-6 md:p-8 border-b md:border-b-0 md:border-l border-border">
            <h2
              id="paywall-title"
              className="text-2xl font-bold mb-1"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Unlock the full archive
            </h2>
            <p className="text-sm text-muted mb-5">
              Every headline, every history — as long as you subscribe.
            </p>

            <div className="inline-flex rounded-full border border-border bg-card p-1 mb-4">
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
          </div>

          {/* Free — bottom on mobile, left on desktop */}
          <div className="order-2 md:order-1 md:col-span-2 p-6 md:p-8 flex flex-col">
            <h3
              className="text-base font-semibold mb-1"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Just exploring?
            </h3>
            <p className="text-sm text-muted mb-4">
              Continue free — but you&apos;ll only see the top 5 headlines.
            </p>
            <ul className="text-xs text-muted space-y-1.5 mb-6 leading-relaxed">
              <li>· Top 5 headlines per day</li>
              <li>· Full history for each</li>
              <li>· No archive access</li>
            </ul>
            <button
              type="button"
              onClick={onContinueFree}
              className="mt-auto text-sm font-medium border border-border text-foreground py-2 rounded hover:border-accent hover:text-accent transition-colors cursor-pointer"
            >
              Continue free
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
