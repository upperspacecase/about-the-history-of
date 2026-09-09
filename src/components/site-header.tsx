import Link from "next/link";

/**
 * Shared masthead and navigation for the public reading pages (§10):
 * Today's briefing · Archive · How it works.
 */
export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className="border-b border-border">
      <div className="max-w-3xl mx-auto px-6 pt-6 pb-4 text-center">
        <Link href="/" className="inline-block">
          <h1
            className={`${compact ? "text-2xl" : "text-4xl sm:text-5xl"} font-bold tracking-tight`}
            style={{ fontFamily: "var(--font-serif)" }}
          >
            The Long View
          </h1>
        </Link>
        <p className="text-sm text-muted mt-1">
          Understand the news. Get on with your day.
        </p>
        <nav className="mt-4 flex items-center justify-center gap-6 text-xs font-medium uppercase tracking-wider">
          <Link href="/" className="text-muted hover:text-accent transition-colors">
            Today&apos;s briefing
          </Link>
          <Link
            href="/archive"
            className="text-muted hover:text-accent transition-colors"
          >
            Archive
          </Link>
          <Link
            href="/how-it-works"
            className="text-muted hover:text-accent transition-colors"
          >
            How it works
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-3xl mx-auto px-6 py-6 text-center text-xs text-muted space-y-2">
        <p>
          Prepared with AI using the linked sources. Analysis is provisional.{" "}
          <Link href="/how-it-works" className="hover:text-accent underline">
            Read our method and corrections policy
          </Link>
          .
        </p>
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link href="/privacy" className="hover:text-accent transition-colors">
            Privacy
          </Link>
          <span aria-hidden>·</span>
          <Link href="/terms" className="hover:text-accent transition-colors">
            Terms
          </Link>
          <span aria-hidden>·</span>
          <Link href="/account" className="hover:text-accent transition-colors">
            Manage your subscription
          </Link>
        </p>
      </div>
    </footer>
  );
}
