import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { EditionView } from "@/components/edition-view";
import { getPublicEdition } from "@/lib/public-story";

export const dynamic = "force-dynamic";

export default async function BriefingPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const edition = valid ? await getPublicEdition(date) : null;

  return (
    <div className="flex flex-col flex-1">
      <SiteHeader compact />
      {edition ? (
        <EditionView edition={edition} />
      ) : (
        <main className="flex-1 max-w-3xl mx-auto px-6 py-16 w-full text-center">
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            No briefing was published for {valid ? date : "that date"}.
          </h2>
          <p className="mt-6 text-sm">
            <Link href="/" className="text-accent hover:underline">
              Back to the briefing
            </Link>
          </p>
        </main>
      )}
      <SiteFooter />
    </div>
  );
}
