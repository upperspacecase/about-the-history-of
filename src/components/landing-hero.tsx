"use client";

import Image from "next/image";
import { useAuth } from "@/lib/firebase/auth-context";

interface LandingHeroProps {
  dateLabel: string;
}

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

export function LandingHero({ dateLabel }: LandingHeroProps) {
  const { signIn } = useAuth();

  return (
    <section className="border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        <div>
          <p className="text-xs tracking-widest uppercase text-muted mb-4">
            {dateLabel}
          </p>
          <h2
            className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Today&apos;s Headlines, in Context
          </h2>
          <div className="mt-6 w-16 h-px bg-accent/60" aria-hidden />
          <p className="mt-6 text-lg text-muted leading-relaxed max-w-xl">
            The Long View turns major headlines into short historical timelines
            — the precedent, the pattern, and the story beneath the story.
          </p>

          <div className="mt-8">
            <button
              type="button"
              onClick={() => signIn()}
              className="inline-flex items-center gap-3 bg-foreground text-background font-semibold px-5 py-3 rounded hover:opacity-90 transition-opacity cursor-pointer"
            >
              <span className="bg-white rounded p-1 flex items-center justify-center">
                <GoogleLogo />
              </span>
              Sign in with Google
            </button>
          </div>

          <ol className="mt-10 space-y-6">
            {PRINCIPLES.map((p) => (
              <li key={p.n} className="flex items-start gap-4">
                <span
                  aria-hidden
                  className="shrink-0 w-10 h-10 rounded bg-highlight border border-border flex items-center justify-center text-lg font-semibold"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {p.n}
                </span>
                <div>
                  <h3
                    className="text-base font-semibold mb-1"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {p.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">
                    {p.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="relative">
          <Image
            src="/hero-story.png"
            alt="An example Long View story: a major headline alongside its historical timeline, key moments, and why-it-matters context."
            width={1086}
            height={1448}
            priority
            className="w-full h-auto"
          />
        </div>
      </div>
    </section>
  );
}
