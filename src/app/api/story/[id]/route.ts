import { getStory, getVersion } from "@/lib/story-store";
import { toPublicStoryPage } from "@/lib/public-story";

export const dynamic = "force-dynamic";

// Published story/version payload by version id or story id (§12). Never
// returns an unvalidated draft: only documents in storyVersions (which are
// written exclusively by the publication gate) resolve here.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^[A-Za-z0-9-]{4,90}$/.test(id)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }

  // A version id (`${storyId}-v${n}`) resolves that version; a bare story
  // id resolves the latest published version.
  let version = await getVersion(id);
  if (!version) {
    const story = await getStory(id);
    if (story) version = await getVersion(story.latestVersionId);
  }
  if (!version) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  const story = await getStory(version.storyId);
  if (!story) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  const payload = await toPublicStoryPage(story, version);
  return Response.json({ story: payload });
}
