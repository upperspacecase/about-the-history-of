// Direct Meta Graph API publishing for The Long View daily Reels.
// Facebook-Login config: one long-lived Page access token drives BOTH the
// linked Instagram account and the Facebook Page. The Reel must already be
// hosted at a public HTTPS URL — Meta fetches it server-side.
//
// Required env: META_PAGE_ACCESS_TOKEN, IG_USER_ID, FB_PAGE_ID
// Verified against Meta Graph API v25.0 (developers.facebook.com, 2026-06-03).

const API_VERSION = "v25.0";
const GRAPH = `https://graph.facebook.com/${API_VERSION}`;
const RUPLOAD = `https://rupload.facebook.com/video-upload/${API_VERSION}`;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function requireEnv(name: string): string {
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

async function graphGet<T>(
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

/** Publish a Reel to the Facebook Page. Returns the Page video ID. */
export async function publishFacebookReel(input: {
  videoUrl: string;
  description: string;
}): Promise<string> {
  const token = requireEnv("META_PAGE_ACCESS_TOKEN");
  const pageId = requireEnv("FB_PAGE_ID");

  // 1. Start an upload session.
  const start = await graphPost<{ video_id: string }>(
    `/${pageId}/video_reels`,
    { upload_phase: "start" },
    token,
  );

  // 2. Hand Meta the public URL to ingest. The host must allow the
  //    facebookexternalhit user agent and must not be an fbcdn URL — Vercel Blob is fine.
  const uploadRes = await fetch(`${RUPLOAD}/${start.video_id}`, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${token}`,
      file_url: input.videoUrl,
    },
  });
  await parseGraph<{ success?: boolean }>(uploadRes);

  // 3. Publish. If Meta reports the video is not yet ready here, poll
  //    GET /{video_id}?fields=status before finishing.
  await graphPost<{ success?: boolean }>(
    `/${pageId}/video_reels`,
    {
      upload_phase: "finish",
      video_id: start.video_id,
      video_state: "PUBLISHED",
      description: input.description,
    },
    token,
  );
  return start.video_id;
}

export interface PublishResult {
  instagramMediaId: string | null;
  facebookVideoId: string | null;
  errors: string[];
}

/**
 * Publish one Reel to both Instagram and the Facebook Page. Each platform is
 * isolated: a failure on one is recorded in `errors` but does not discard the
 * other's success, so the caller can still dedupe and log what went out.
 */
export async function publishReel(input: {
  videoUrl: string;
  igCaption: string;
  fbDescription: string;
}): Promise<PublishResult> {
  const errors: string[] = [];
  let instagramMediaId: string | null = null;
  let facebookVideoId: string | null = null;

  try {
    instagramMediaId = await publishInstagramReel({
      videoUrl: input.videoUrl,
      caption: input.igCaption,
    });
  } catch (err) {
    errors.push(`instagram: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    facebookVideoId = await publishFacebookReel({
      videoUrl: input.videoUrl,
      description: input.fbDescription,
    });
  } catch (err) {
    errors.push(`facebook: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { instagramMediaId, facebookVideoId, errors };
}
