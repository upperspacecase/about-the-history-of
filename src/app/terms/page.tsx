import Link from "next/link";

export const metadata = {
  title: "Terms of Service — The Long View",
  description: "The terms under which The Long View is offered.",
};

export default function TermsPage() {
  return (
    <div className="flex flex-col flex-1">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-muted hover:text-accent transition-colors"
          >
            ← All Headlines
          </Link>
          <div className="h-4 w-px bg-border" />
          <span
            className="text-sm font-medium"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            The Long View
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
        <p className="text-xs uppercase tracking-widest text-muted mb-3">
          Last updated 29 April 2026
        </p>
        <h1
          className="text-4xl sm:text-5xl font-bold tracking-tight mb-6"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Terms of Service
        </h1>

        <p className="text-lg text-muted leading-relaxed mb-10">
          By using The Long View you agree to the terms below. They&apos;re
          short on purpose.
        </p>

        <Section title="The service">
          <p>
            The Long View aggregates public news headlines and, on request,
            generates a structured historical analysis of the topic behind
            each headline. Headlines are sourced from public RSS feeds.
            Histories are written by an AI model and may contain errors or
            omissions.
          </p>
        </Section>

        <Section title="Accounts">
          <p>
            Generating a new history requires signing in with Google. You are
            responsible for activity that happens through your account. Don&apos;t
            share access; if something goes wrong, sign out and tell us.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>
            Don&apos;t use the service to harass anyone, generate content
            intended to deceive, scrape at volumes that disrupt the service,
            or attempt to circumvent rate limits or security controls. We may
            suspend accounts that do.
          </p>
        </Section>

        <Section title="Accuracy">
          <p>
            Histories are produced by a language model and are not fact-checked
            by a human before publication. Treat them as a starting point, not
            a citation. Use the linked further-reading sources to verify
            anything that matters.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            We may update these terms or the service itself. Material changes
            will be reflected on this page with a new &ldquo;Last updated&rdquo;
            date.
          </p>
        </Section>

        <Section title="Liability">
          <p>
            The service is provided as-is, without warranty. To the extent
            permitted by law, we are not liable for indirect or consequential
            damages arising from your use of it.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions:{" "}
            <a
              href="mailto:hello@thelongview.org"
              className="text-accent hover:underline"
            >
              hello@thelongview.org
            </a>
          </p>
        </Section>
      </main>

      <footer className="border-t border-border mt-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center text-xs text-muted">
          <Link href="/" className="hover:text-accent transition-colors">
            ← Back to The Long View
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2
        className="text-xs font-medium uppercase tracking-widest text-muted mb-3"
      >
        {title}
      </h2>
      <div className="space-y-4 text-base leading-relaxed">{children}</div>
    </section>
  );
}
