// Direct Meta Graph API publishing for The Long View daily Reels (Instagram only).
// Facebook Page publishing was removed: pages_manage_posts is gated behind Meta
// App Review for this app, so the pipeline publishes to Instagram only.
//
// Required env: META_PAGE_ACCESS_TOKEN, IG_USER_ID
// Verified against Meta Graph API v25.0 (developers.facebook.com, 2026-06-03).

const API_VERSION = "v25.0";
const GRAPH = `https://graph.facebook.com/${API_VERSION}`;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function parseGraph<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: unknown = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  const error = (json as { error?: { message?: string } }).error;
  if (!res.ok || error) {
    throw new Error(
      `Meta Graph error (${res.status}): ${error?.message ?? text ?? res.statusText}`,
    );
  }
  return json as T;
}

export async function graphGet<T>(
  pathname: string,
  params: Record<string, string>,
  token: string,
): Promise<T> {
  const url = new URL(`${GRAPH}${pathname}`);
  for (const [key, value] of Object.entries({ ...params, access_token: token })) {
    url.searchParams.set(key, value);
  }
  return parseGraph<T>(await fetch(url, { method: "GET" }));
}

async function graphPost<T>(
  pathname: string,
  params: Record<string, string>,
  token: string,
): Promise<T> {
  const body = new URLSearchParams({ ...params, access_token: token });
  return parseGraph<T>(await fetch(`${GRAPH}${pathname}`, { method: "POST", body }));
}

// IG video containers process asynchronously; poll status_code until FINISHED.
async function waitForContainer(containerId: string, token: string): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const { status_code } = await graphGet<{ status_code: string }>(
      `/${containerId}`,
      { fields: "status_code" },
      token,
    );
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR" || status_code === "EXPIRED") {
      throw new Error(`IG container ${containerId} failed with status ${status_code}`);
    }
    await sleep(10_000);
  }
  throw new Error(`IG container ${containerId} did not finish within ~5 minutes`);
}

/** Publish a Reel to the linked Instagram account. Returns the published media ID. */
export async function publishInstagramReel(input: {
  videoUrl: string;
  caption: string;
}): Promise<string> {
  const token = requireEnv("META_PAGE_ACCESS_TOKEN");
  const igUserId = requireEnv("IG_USER_ID");

  const container = await graphPost<{ id: string }>(
    `/${igUserId}/media`,
    {
      media_type: "REELS",
      video_url: input.videoUrl,
      caption: input.caption,
      share_to_feed: "true",
    },
    token,
  );
  await waitForContainer(container.id, token);
  const published = await graphPost<{ id: string }>(
    `/${igUserId}/media_publish`,
    { creation_id: container.id },
    token,
  );
  return published.id;
}

export interface PublishResult {
  instagramMediaId: string | null;
  errors: string[];
}

/** Publish one Reel to Instagram. */
export async function publishReel(input: {
  videoUrl: string;
  igCaption: string;
}): Promise<PublishResult> {
  const errors: string[] = [];
  let instagramMediaId: string | null = null;
  try {
    instagramMediaId = await publishInstagramReel({
      videoUrl: input.videoUrl,
      caption: input.igCaption,
    });
  } catch (err) {
    errors.push(`instagram: ${err instanceof Error ? err.message : String(err)}`);
  }
  return { instagramMediaId, errors };
}
