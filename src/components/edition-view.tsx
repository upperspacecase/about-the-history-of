import Link from "next/link";
import type { PublicEdition } from "@/lib/public-story";
import { EmailCapture } from "@/components/email-capture";

function formatLongDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

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

function StoryCard({ card }: { card: PublicEdition["cards"][number] }) {
  return (
    <article className="border-b border-border pb-8">
      <p className="text-xs font-medium uppercase tracking-wider text-accent mb-1">
        {card.updateKind === "development" ? "Since our last update" : "In context"}
      </p>
      <h3
        className="text-xl sm:text-2xl font-bold leading-snug"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        <Link
          href={`/story/${card.slug}?version=${encodeURIComponent(card.versionId)}`}
          className="hover:text-accent transition-colors"
        >
          {card.editorialHeadline}
        </Link>
      </h3>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed">
        <p>
          <span className="font-semibold">What changed: </span>
          {card.whatChanged}
        </p>
        <p>
          <span className="font-semibold">Why it matters: </span>
          {card.whyItMatters}
        </p>
        {card.uncertainty && (
          <p className="text-muted text-sm">{card.uncertainty}</p>
        )}
      </div>
      <p className="mt-3 text-xs text-muted">
        Drawn from {card.sourceCount}{" "}
        {card.sourceCount === 1 ? "report" : "reports"} (
        {card.publishers.join(", ")})
      </p>
      <p className="mt-2">
        <Link
          href={`/story/${card.slug}?version=${encodeURIComponent(card.versionId)}`}
          className="text-sm font-medium text-accent hover:underline"
        >
          Read the full story
        </Link>
      </p>
    </article>
  );
}

export function EditionView({
  edition,
  delayed,
}: {
  edition: PublicEdition;
  /** Set when this is the latest edition but a newer one was expected. */
  delayed?: boolean;
}) {
  const isQuiet = edition.status === "quiet";
  const isUnavailable = edition.status === "unavailable";

  return (
    <main className="flex-1 max-w-3xl mx-auto px-6 py-8 w-full">
      {delayed && (
        <div className="mb-6 border border-border rounded-lg p-4 bg-highlight text-sm">
          <p className="font-semibold">Today&apos;s briefing is delayed</p>
          <p className="text-muted mt-1">
            The latest published edition is from {formatLongDate(edition.id + "T12:00:00Z")}.
            We&apos;re working on the next one.
          </p>
        </div>
      )}

      <div className="mb-6">
        <h2
          className="text-lg font-bold"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {delayed ? "Latest briefing" : "Today's briefing"}
        </h2>
        <p className="text-xs uppercase tracking-widest text-muted mt-1">
          {formatLongDate(edition.id + "T12:00:00Z")}
          {edition.storyCount > 0 && (
            <>
              {" "}· {edition.storyCount}{" "}
              {edition.storyCount === 1 ? "story" : "stories"} · About{" "}
              {edition.readingMinutes}{" "}
              {edition.readingMinutes === 1 ? "minute" : "minutes"}
            </>
          )}
        </p>
        {edition.storyCount > 0 && (
          <p className="text-sm text-muted mt-3">
            The developments worth understanding today, with enough background
            to follow them.
          </p>
        )}
      </div>

      {edition.limitedCoverage && !isUnavailable && (
        <div className="mb-6 border border-border rounded-lg p-4 text-sm">
          <p className="font-semibold">Today&apos;s briefing has limited coverage</p>
          <p className="text-muted mt-1">
            We couldn&apos;t review all of our usual sources. The stories below
            passed our checks, but this edition may miss important developments.
          </p>
        </div>
      )}

      {isQuiet && (
        <div className="py-8">
          <h3
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            No substantial updates in this edition
          </h3>
          <p className="text-muted mt-2 text-[15px] leading-relaxed">
            Among the stories we reviewed, we found no new developments
            substantial enough for another briefing. You can explore the
            background in the{" "}
            <Link href="/archive" className="text-accent hover:underline">
              archive
            </Link>
            .
          </p>
        </div>
      )}

      {isUnavailable && (
        <div className="py-8">
          <h3
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            We don&apos;t have a briefing ready to publish
          </h3>
          <p className="text-muted mt-2 text-[15px] leading-relaxed">
            We couldn&apos;t verify enough of today&apos;s reporting to publish
            a useful edition. This does not mean little has happened.
            We&apos;ll update this page when a checked edition is ready.
          </p>
        </div>
      )}

      {edition.cards.length > 0 && (
        <div className="space-y-8">
          {edition.cards.map((card) => (
            <StoryCard key={card.versionId} card={card} />
          ))}
        </div>
      )}

      {/* Clear ending (BRF 06): completion message, one optional email
          invitation, an archive link. No feed below. */}
      <div className="mt-10 text-center">
        <h3
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          You&apos;re caught up on this briefing.
        </h3>
        <p className="text-muted text-sm mt-2">
          We&apos;ll bring you the next edition when it&apos;s ready.
        </p>
      </div>

      <div className="mt-10 border border-border rounded-lg p-6 bg-card">
        <EmailCapture
          heading="Get the briefing by email"
          sub="The same short briefing, delivered once a day. Free during the beta. Unsubscribe any time."
          source="briefing-footer"
          buttonLabel="Send me the briefing"
          doneMessage="You're subscribed. The next published briefing will arrive in your inbox."
        />
        <p className="text-xs text-muted mt-3">
          By signing up, you agree to receive The Long View briefing. See our{" "}
          <Link href="/privacy" className="underline hover:text-accent">
            privacy policy
          </Link>
          .
        </p>
      </div>

      <p className="mt-8 text-center text-sm">
        <Link href="/archive" className="text-accent hover:underline">
          Explore the background
        </Link>
      </p>

      <p className="mt-6 text-center text-xs text-muted">
        Published {formatDateTime(edition.publishedAt)}
      </p>
    </main>
  );
}
