"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-context";
import { ExampleStory } from "./example-story";

interface PaymentPopupProps {
  dateLabel: string;
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

function GoogleLogo() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.8741 2.6836-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.8595-3.0477.8595-2.3441 0-4.3286-1.5832-5.0364-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.9636 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.9636 10.71z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.9636 7.29C4.6714 5.1627 6.6559 3.5795 9 3.5795z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function PaymentPopup({ dateLabel }: PaymentPopupProps) {
  const { user, signIn, signOut, getIdToken } = useAuth();
  const [plan, setPlan] = useState<Plan>("yearly");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [signInLoading, setSignInLoading] = useState(false);
  const [error, setError] = useState("");

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

  async function handleSignIn() {
    if (signInLoading) return;
    setError("");
    setSignInLoading(true);
    try {
      await signIn();
      const token = await getIdToken();
      if (!token) {
        setError("Sign-in failed. Try again.");
        return;
      }
      const res = await fetch("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as {
        isPaying?: boolean;
      };
      if (!data.isPaying) {
        await signOut();
        setError(
          "Sign-in is only for active subscribers. Subscribe to access The Long View."
        );
        return;
      }
      // success — page useEffect picks up the paying status and hides the popup
    } catch {
      setError("Sign-in was cancelled or failed.");
    } finally {
      setSignInLoading(false);
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
        {/* Top: hero copy + pricing/sign-in */}
        <div className="grid grid-cols-1 md:grid-cols-5">
          {/* Hero copy + principles */}
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
          </div>

          {/* Pricing + Sign-in */}
          <div className="md:col-span-2 bg-highlight p-6 md:p-8 flex flex-col gap-6">
            {/* Subscribe */}
            <section>
              <h3
                className="text-lg font-bold mb-3"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Subscribe
              </h3>

              <div className="inline-flex rounded-full border border-border bg-card p-1 mb-4 self-start">
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

              <div className="mb-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold tracking-tight">
                  {price}
                </span>
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

              <Link
                href="/preview"
                className="mt-4 block text-center text-sm font-medium border border-border text-foreground py-2 rounded hover:border-accent hover:text-accent transition-colors"
              >
                Preview free
              </Link>
            </section>

            {/* Sign in */}
            <section className="border-t border-border pt-5">
              <h3
                className="text-lg font-bold mb-1"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Already a subscriber?
              </h3>
              <p className="text-xs text-muted mb-3">
                Sign in to read today&apos;s history.
              </p>
              <button
                type="button"
                onClick={handleSignIn}
                disabled={signInLoading}
                className="w-full inline-flex items-center justify-center gap-3 bg-foreground text-background font-semibold py-2.5 rounded hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="bg-white rounded p-1 flex items-center justify-center">
                  <GoogleLogo />
                </span>
                {signInLoading ? "Opening Google…" : "Sign in with Google"}
              </button>
            </section>

            {error && (
              <p className="text-xs text-accent" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Bottom: example story (full width on desktop, stacks below on mobile) */}
        <div className="border-t border-border p-6 md:p-8">
          <ExampleStory />
        </div>
      </div>
    </div>
  );
}
