import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { EditionView } from "@/components/edition-view";
import { getPublicEdition } from "@/lib/public-story";
import LegacyHome from "@/components/legacy-home";

// Published content is server-rendered and public (PRD §13, §14): reading
// the briefing never starts a model call and never depends on client auth.
export const dynamic = "force-dynamic";

function todayUtcId(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function Home() {
  // Rollback flag (§17): LEGACY_HOMEPAGE=1 restores the old feed homepage.
  if (process.env.LEGACY_HOMEPAGE === "1") {
    return <LegacyHome />;
  }

  let edition = null;
  try {
    edition = await getPublicEdition();
  } catch (err) {
    console.error("Failed to load latest edition:", err);
  }

  if (!edition) {
    return (
      <div className="flex flex-col flex-1">
        <SiteHeader />
        <main className="flex-1 max-w-3xl mx-auto px-6 py-16 w-full text-center">
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            We don&apos;t have a briefing ready to publish
          </h2>
          <p className="text-muted mt-3 text-[15px] leading-relaxed">
            We couldn&apos;t load a published edition. This does not mean
            little has happened. We&apos;ll update this page when a checked
            edition is ready.
          </p>
          <p className="mt-6 text-sm">
            <Link href="/archive" className="text-accent hover:underline">
              Explore the background
            </Link>
          </p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  // Delayed only after the scheduled publish window (07:00 UTC + slack) has
  // passed with no new edition; before that, yesterday's edition is simply
  // the latest.
  const delayed =
    edition.id < todayUtcId() && new Date().getUTCHours() >= 9;

  return (
    <div className="flex flex-col flex-1">
      <SiteHeader />
      <EditionView edition={edition} delayed={delayed} />
      <SiteFooter />
    </div>
  );
}
