"use client";

import { useAuth } from "@/lib/firebase/auth-context";

const CHECKS = [
  "No outrage cycle",
  "No shallow takes",
  "Just the context that matters",
];

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="shrink-0 text-accent"
    >
      <circle cx="8" cy="8" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 8.25 L7.25 10.5 L11 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LandingBanner() {
  const { signIn } = useAuth();

  return (
    <section className="border-t border-border bg-highlight">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
        <p
          className="text-xl md:text-2xl font-semibold leading-snug md:flex-1"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          A calmer, smarter way to follow the news.
        </p>

        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
          {CHECKS.map((c) => (
            <li key={c} className="flex items-center gap-2">
              <CheckIcon />
              <span>{c}</span>
            </li>
          ))}
        </ul>

        <div className="md:ml-2 flex flex-col items-start md:items-end gap-1">
          <button
            type="button"
            onClick={() => signIn()}
            className="bg-foreground text-background font-semibold px-5 py-2.5 rounded hover:opacity-90 transition-opacity cursor-pointer"
          >
            Start reading — £5/month
          </button>
          <span className="text-xs text-muted">Cancel anytime</span>
        </div>
      </div>
    </section>
  );
}
