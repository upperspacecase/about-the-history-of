"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-context";
import { trackClick } from "@/lib/track";
import { ExampleStory } from "./example-story";
import { EmailCapture } from "@/components/email-capture";

interface PaymentPopupProps {
  dateLabel: string;
}

const VALUE_PROPS = [
  {
    icon: "/icons/history-rhyme.png",
    title: "Know what changed. Ignore what didn't.",
    body: "Three stories each morning, ranked by historical significance. Never more.",
  },
  {
    icon: "/icons/signal-noise.png",
    title: "A noise check, every day.",
    body: "When a heavily covered story changes less than the coverage implies, we say so.",
  },
  {
    icon: "/icons/no-finish-line.png",
    title: "Under five minutes.",
    body: "Calmer, clearer, appropriately informed before you start work.",
  },
];

const PLAN_FEATURES = [
  "One morning email with up to three stories",
  "A provisional significance judgment for every story",
  "The closest historical precedent, and the crucial difference",
  "What would raise or lower each judgment",
  "A searchable web archive",
  "Automatic updates when important evidence changes",
];

const SOURCES = [
  "BBC",
  "New York Times",
  "CNN",
  "Washington Post",
  "Wall Street Journal",
  "Al Jazeera",
  "NPR",
  "TechCrunch",
];

function Check() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden
      className="shrink-0 mt-0.5 text-green-700 dark:text-green-500"
    >
      <path
        d="M3.5 8.5l3 3 6-7.5"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [signInLoading, setSignInLoading] = useState(false);
  const [error, setError] = useState("");
  const [justPaid, setJustPaid] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") === "1") setJustPaid(true);
  }, []);

  async function handleCheckout() {
    if (checkoutLoading) return;
    trackClick("checkout");
    setError("");
    setCheckoutLoading(true);
    try {
      // Pay first, no account required. Link to an existing account only if
      // the visitor already happens to be signed in.
      const token = user ? await getIdToken() : null;
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ plan: "annual" }),
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
    trackClick("signin");
    setError("");
    setSignInLoading(true);
    try {
      await signIn();
      const token = await getIdToken();
      if (!token) {
        setError("Sign-in failed. Try again.");
        return;
      }
      // init creates the account, links any subscription paid for beforehand,
      // and reports whether this account is now active.
      const res = await fetch("/api/users/init", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as {
        isPaying?: boolean;
      };
      if (!data.isPaying) {
        await signOut();
        setError(
          "Sign-in is only for active subscribers. Start a trial to access The Long View."
        );
        return;
      }
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
        <div className="p-6 md:p-10">
          {justPaid && !user && (
            <div className="mb-6 rounded-lg border border-green-700/40 bg-green-700/5 p-4">
              <p
                className="text-sm font-semibold"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Your trial has started.
              </p>
              <p className="text-sm text-muted mt-1">
                Sign in with the email you used at checkout to unlock The Long
                View.
              </p>
            </div>
          )}

          {/* Hero */}
          <p className="text-xs tracking-widest uppercase text-muted mb-3">
            {dateLabel}
          </p>
          <h2
            id="paywall-title"
            className="text-3xl md:text-4xl font-bold leading-[1.1] tracking-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Not everything breaking is important.
          </h2>
          <p className="mt-4 text-sm md:text-base text-muted leading-relaxed max-w-2xl">
            The Long View ranks three stories each morning by historical
            significance, so you can understand what changed and ignore what
            didn&apos;t.
          </p>
          <p className="mt-2 text-sm text-muted leading-relaxed max-w-2xl">
            A five-minute daily briefing for people who want to stay informed
            without living in the news.
          </p>

          {/* Value props */}
          <ol className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-5">
            {VALUE_PROPS.map((p) => (
              <li key={p.icon} className="flex items-start gap-3">
                <Image
                  src={p.icon}
                  alt=""
                  aria-hidden
                  width={40}
                  height={40}
                  className="shrink-0 w-10 h-10"
                />
                <div>
                  <h3
                    className="text-sm font-semibold mb-0.5"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {p.title}
                  </h3>
                  <p className="text-xs text-muted leading-relaxed">{p.body}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* The one plan */}
          <div className="mt-9 grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            <div className="border border-border rounded-xl p-6 bg-card flex flex-col">
              <h3
                className="text-lg font-bold"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                The Daily Long View
              </h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold tracking-tight">$99</span>
                <span className="text-sm text-muted">/year</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                14-day free trial. Cancel anytime.
              </p>
              <button
                type="button"
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="mt-5 w-full bg-accent text-white font-semibold py-2.5 rounded hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {checkoutLoading
                  ? "Opening Stripe…"
                  : "Start your 14-day trial · $99/year"}
              </button>
              <ul className="mt-5 space-y-2.5 text-sm border-t border-border pt-5">
                {PLAN_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-5">
              <div className="border border-border rounded-xl p-6 bg-highlight">
                <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted mb-2">
                  Each morning, up to three stories
                </p>
                <ul className="space-y-3 text-sm">
                  <li>
                    <span
                      className="font-semibold"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      The shift.
                    </span>{" "}
                    <span className="text-muted">
                      The event most likely to create durable change.
                    </span>
                  </li>
                  <li>
                    <span
                      className="font-semibold"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      The pattern.
                    </span>{" "}
                    <span className="text-muted">
                      An important development following a recognisable
                      historical mechanism.
                    </span>
                  </li>
                  <li>
                    <span
                      className="font-semibold"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      The noise check.
                    </span>{" "}
                    <span className="text-muted">
                      A heavily covered event that currently changes less than
                      the coverage implies.
                    </span>
                  </li>
                </ul>
                <p className="mt-4 text-xs text-muted leading-relaxed">
                  On a quiet day you may get fewer than three. We would rather
                  tell you nothing much happened than invent significance.
                </p>
              </div>
              <div className="border border-border rounded-xl p-5 bg-card">
                <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted mb-2">
                  Drawn from
                </p>
                <p className="text-xs text-muted leading-relaxed">
                  {SOURCES.join(" · ")}
                </p>
              </div>
            </div>
          </div>

          {/* Secondary actions */}
          <div className="mt-9 grid grid-cols-1 sm:grid-cols-3 gap-5 border-t border-border pt-6 items-start">
            <div>
              <h4
                className="text-sm font-semibold mb-2"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Just browsing?
              </h4>
              <Link
                href="/preview"
                className="block w-full text-center text-sm font-medium border border-border text-foreground py-2 rounded hover:border-accent hover:text-accent transition-colors"
              >
                Free preview
              </Link>
            </div>
            <div>
              <h4
                className="text-sm font-semibold mb-2"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Already a subscriber?
              </h4>
              <button
                type="button"
                onClick={handleSignIn}
                disabled={signInLoading}
                className="w-full inline-flex items-center justify-center gap-3 bg-foreground text-background font-semibold py-2 rounded hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="bg-white rounded p-1 flex items-center justify-center">
                  <GoogleLogo />
                </span>
                {signInLoading ? "Opening…" : "Sign in"}
              </button>
            </div>
            <div>
              <h4
                className="text-sm font-semibold mb-2"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Subscribe to the newsletter
              </h4>
              <EmailCapture source="paywall" buttonLabel="Subscribe" />
            </div>
          </div>
          {error && (
            <p className="text-xs text-accent mt-3" role="alert">
              {error}
            </p>
          )}

          {/* Example story */}
          <div className="border-t border-border mt-9 pt-6">
            <ExampleStory />
          </div>

          {/* Transparency */}
          <p className="mt-8 text-[11px] text-muted leading-relaxed border-t border-border pt-4">
            The Long View is produced by an automated analysis system using
            linked reporting and historical sources. Every story passes
            automated sourcing, consistency, similarity, and confidence
            checks. Analysis remains provisional and may be updated as
            evidence changes.
          </p>
        </div>
      </div>
    </div>
  );
}
