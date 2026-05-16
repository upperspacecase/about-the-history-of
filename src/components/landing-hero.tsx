"use client";

import Image from "next/image";
import { useAuth } from "@/lib/firebase/auth-context";

interface LandingHeroProps {
  dateLabel: string;
  onReadFreeIssue: () => void;
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TimelineIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 18 L9 12 L13 15 L21 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="12" r="1.5" fill="currentColor" />
      <circle cx="13" cy="15" r="1.5" fill="currentColor" />
      <circle cx="21" cy="6" r="1.5" fill="currentColor" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="5.5"
        width="17"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8 3v4M16 3v4M3.5 10h17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const BULLETS = [
  { icon: ClockIcon, label: "One headline." },
  { icon: TimelineIcon, label: "One historical timeline." },
  { icon: CalendarIcon, label: "Every day." },
];

export function LandingHero({ dateLabel, onReadFreeIssue }: LandingHeroProps) {
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
            Today&apos;s news makes more sense when you know what came before.
          </h2>
          <div className="mt-6 w-16 h-px bg-accent/60" aria-hidden />
          <p className="mt-6 text-lg text-muted leading-relaxed max-w-xl">
            The Long View turns major headlines into short historical timelines
            — the precedent, the pattern, and the story beneath the story.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => signIn()}
              className="bg-foreground text-background font-semibold px-5 py-3 rounded hover:opacity-90 transition-opacity cursor-pointer"
            >
              Start reading — £5/month
            </button>
            <button
              type="button"
              onClick={onReadFreeIssue}
              className="border border-border text-foreground font-medium px-5 py-3 rounded hover:border-accent hover:text-accent transition-colors cursor-pointer"
            >
              Read a free issue
            </button>
          </div>

          <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
            {BULLETS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <span className="text-accent">
                  <Icon />
                </span>
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <Image
            src="/hero-story.png"
            alt="An example Long View story: a major headline alongside its historical timeline, key moments, and why-it-matters context."
            width={1098}
            height={1433}
            priority
            className="w-full h-auto rounded-lg border border-border shadow-sm bg-card"
          />
        </div>
      </div>
    </section>
  );
}
