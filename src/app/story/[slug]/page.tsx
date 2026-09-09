import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ReportErrorForm } from "@/components/report-error-form";
import { getPublicStory, type PublicStoryPage } from "@/lib/public-story";

export const dynamic = "force-dynamic";

function formatDateTime(iso: string) {
  return `${new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })}, ${new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })} UTC`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ version?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = await getPublicStory(slug);
  if (!story) return { title: "The Long View" };
  return {
    title: `${story.editorialHeadline} | The Long View`,
    description: story.whatChanged.slice(0, 300),
  };
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">
        {label}
      </h2>
      <div className="text-[15px] leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

function CorrectionNotices({ story }: { story: PublicStoryPage }) {
  if (story.corrections.length === 0) return null;
  return (
    <div className="mt-6 space-y-3">
      {story.corrections.map((c, i) => (
        <div
          key={i}
          className="border border-accent/40 rounded-lg p-4 bg-highlight text-sm"
        >
          <p className="font-semibold">
            {c.severity === "retraction" ? "Retraction" : "Correction"} ·{" "}
            {formatDate(c.date)}
          </p>
          <p className="mt-1 leading-relaxed">{c.publicNote}</p>
        </div>
      ))}
    </div>
  );
}

export default async function StoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { version } = await searchParams;
  const story = await getPublicStory(slug, version);

  if (!story) {
    return (
      <div className="flex flex-col flex-1">
        <SiteHeader compact />
        <main className="flex-1 max-w-3xl mx-auto px-6 py-16 w-full text-center">
          <p className="text-[15px] text-muted">
            We haven&apos;t published a sourced explanation of this story yet.
          </p>
          <p className="mt-6 text-sm">
            <Link href="/" className="text-accent hover:underline">
              Back to the briefing
            </Link>
          </p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (story.retracted) {
    return (
      <div className="flex flex-col flex-1">
        <SiteHeader compact />
        <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
          <div className="border border-accent/40 rounded-lg p-6 bg-highlight">
            <h1
              className="text-xl font-bold"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              This analysis has been withdrawn
            </h1>
            {story.corrections
              .filter((c) => c.severity === "retraction")
              .map((c, i) => (
                <p key={i} className="mt-3 text-[15px] leading-relaxed">
                  {c.publicNote}
                </p>
              ))}
            <p className="mt-3 text-sm text-muted">
              It should no longer be relied on. Published{" "}
              {formatDate(story.publishedAt)}.
            </p>
          </div>
          <p className="mt-6 text-sm">
            <Link href="/" className="text-accent hover:underline">
              Back to the briefing
            </Link>
          </p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const isArchivedVersion = !story.isLatest;

  return (
    <div className="flex flex-col flex-1">
      <SiteHeader compact />
      <main className="flex-1 max-w-3xl mx-auto px-6 py-8 w-full">
        {isArchivedVersion && (
          <div className="mb-6 border border-border rounded-lg p-4 bg-highlight text-sm">
            <p>
              You&apos;re reading the version published on{" "}
              {formatDate(story.publishedAt)}. A newer update is available.
            </p>
            <p className="mt-1">
              <Link
                href={`/story/${story.slug}`}
                className="text-accent hover:underline font-medium"
              >
                Read the latest version
              </Link>
            </p>
          </div>
        )}

        <CorrectionNotices story={story} />

        <p className="text-xs font-medium uppercase tracking-wider text-accent mt-6 mb-2">
          In context
        </p>
        <h1
          className="text-2xl sm:text-3xl font-bold leading-tight"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {story.editorialHeadline}
        </h1>
        <p className="mt-3 text-xs text-muted">
          First published {formatDateTime(story.firstPublishedAt)}.
          {story.version > 1 && (
            <> Updated {formatDateTime(story.publishedAt)}.</>
          )}
        </p>

        <Section
          label={
            story.updateKind === "development"
              ? "Since our last update"
              : "What happened"
          }
        >
          <p>{story.whatChanged}</p>
          {story.singleOrigin && (
            <p className="text-muted text-sm">
              This account currently relies on {story.singleOrigin}. We have
              not independently corroborated it.
            </p>
          )}
        </Section>

        <Section label="Why it matters">
          <p>{story.whyItMatters}</p>
        </Section>

        {story.background && (
          <Section label="How we got here">
            <p>{story.background}</p>
          </Section>
        )}

        {story.timeline.length > 0 && (
          <Section label="How we got here, dated">
            <ol className="space-y-3">
              {story.timeline.map((t, i) => (
                <li key={i} className="flex gap-4">
                  <span
                    className="shrink-0 w-20 text-sm font-semibold"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {t.year}
                  </span>
                  <span className="text-sm leading-relaxed">
                    <span className="font-medium">{t.title}.</span>{" "}
                    {t.description}{" "}
                    <a
                      href={t.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      Source
                    </a>
                  </span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {story.comparison && (
          <Section label="A useful comparison">
            <p>
              <span className="font-medium">{story.comparison.name}.</span>{" "}
              {story.comparison.similarity}
            </p>
            <p className="text-muted">
              <span className="font-medium text-foreground">
                Where the comparison breaks down:{" "}
              </span>
              {story.comparison.limitation}
            </p>
          </Section>
        )}

        {story.uncertainties.length > 0 && (
          <Section label="What remains unclear">
            <ul className="list-disc pl-5 space-y-1 text-[15px]">
              {story.uncertainties.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
          </Section>
        )}

        {story.whatToWatch && (
          <Section label="What to watch">
            <p>{story.whatToWatch}</p>
          </Section>
        )}

        <Section label="Sources and evidence">
          <ul className="space-y-2">
            {story.sources.map((s, i) => (
              <li key={i} className="text-sm leading-relaxed">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  {s.publisher}: {s.title}
                </a>
                <span className="text-muted">
                  {" "}· {s.accessLabel}
                  {s.sourceDate && <> · {formatDate(s.sourceDate)}</>}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            Read the original reporting at the links above. Our analysis can
            be wrong and may change as evidence develops.
          </p>
        </Section>

        {story.furtherReading.length > 0 && (
          <Section label="Related background">
            <ul className="space-y-1">
              {story.furtherReading.map((f, i) => (
                <li key={i} className="text-sm">
                  <a
                    href={f.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    {f.title}
                  </a>
                  {f.author && <span className="text-muted"> — {f.author}</span>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <div className="mt-10 border-t border-border pt-6 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 text-sm">
            {story.previousVersionId && (
              <p>
                <Link
                  href={`/story/${story.slug}?version=${encodeURIComponent(story.previousVersionId)}`}
                  className="text-muted hover:text-accent underline"
                >
                  Read the previous version
                </Link>
              </p>
            )}
            <p>
              <Link href="/" className="text-muted hover:text-accent underline">
                Back to the briefing
              </Link>
            </p>
          </div>
          <ReportErrorForm storyId={story.storyId} versionId={story.versionId} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
