import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/site-header";

export const metadata: Metadata = {
  title: "How The Long View works",
  description:
    "How we select, check and correct the stories in The Long View briefing.",
};

// Method page (ARC 03, §10). Describes implemented capabilities only.
export default function HowItWorksPage() {
  return (
    <div className="flex flex-col flex-1">
      <SiteHeader compact />
      <main className="flex-1 max-w-3xl mx-auto px-6 py-8 w-full">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          How The Long View works
        </h1>
        <div className="mt-5 space-y-4 text-[15px] leading-relaxed">
          <p>
            News often reaches you halfway through the story. The Long View
            brings the developments we select into one short briefing, with
            the background to understand them.
          </p>
          <p>
            We group reports about the same situation and look for meaningful
            changes. If we have covered a story before, we compare the new
            evidence with our previous account. We don&apos;t add stories
            simply to reach a daily quota.
          </p>
          <p>
            Our explanations are prepared with AI using retrieved reporting
            and historical sources. Before publication, automated checks test
            whether the evidence supports the material claims. Historical
            comparisons are included when they help explain the situation and
            can be supported. We show where they fall short.
          </p>
          <p>
            These checks can miss mistakes. Our interpretation is
            provisional, and linked sources are available so you can inspect
            the evidence. We record material corrections and distinguish them
            from new developments.
          </p>
          <p>
            The briefing is selective. It will not cover every important
            event, and limited access to reporting can affect what we
            publish. We tell you when coverage is incomplete or an edition is
            delayed.
          </p>
          <p>
            If you find a factual error, use &ldquo;Flag a factual
            error&rdquo; on the story page.
          </p>
        </div>
        <p className="mt-8 text-sm">
          <Link href="/" className="text-accent hover:underline">
            Back to the briefing
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
