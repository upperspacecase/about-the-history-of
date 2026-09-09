import { getAdminDb } from "@/lib/firebase/admin";
import type { HistoryDoc } from "@/lib/history-types";
import { headlineKey } from "@/lib/history-key";

function validateHeadline(headline: unknown): string | { error: string; status: number } {
  if (!headline || typeof headline !== "string") {
    return { error: "A headline is required", status: 400 };
  }
  if (headline.length > 500) {
    return { error: "Headline is too long (max 500 characters)", status: 400 };
  }
  return headline;
}

// Read-only legacy access (AT 19): serves histories that were published under
// the old headline-keyed model. When a legacy history has been mapped to a
// canonical story, the response includes the story slug so the page can point
// readers at the current version.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const headline = url.searchParams.get("headline");
  const result = validateHeadline(headline);
  if (typeof result !== "string") {
    return Response.json({ error: result.error }, { status: result.status });
  }

  const id = headlineKey(result);
  const db = getAdminDb();
  const snap = await db.collection("histories").doc(id).get();
  if (!snap.exists) {
    return Response.json({ cached: false }, { status: 404 });
  }
  const data = snap.data() as HistoryDoc & { storyId?: string };

  let storySlug: string | undefined;
  if (data.storyId) {
    const story = await db.collection("stories").doc(data.storyId).get();
    storySlug = (story.data() as { slug?: string } | undefined)?.slug;
  }

  return Response.json({ cached: true, legacy: true, storySlug, ...data });
}

// Interactive generation from a bare headline is removed (PRD §7: never
// produce factual analysis from headline text alone).
export async function POST() {
  return Response.json(
    {
      error:
        "We haven't published a sourced explanation of this story yet.",
    },
    { status: 410 }
  );
}
