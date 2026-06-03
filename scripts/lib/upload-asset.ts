import { readFile } from "node:fs/promises";
import path from "node:path";
import { put, list, del } from "@vercel/blob";

/**
 * Upload a local file to Vercel Blob and return its public HTTPS URL.
 * Reads BLOB_READ_WRITE_TOKEN from the environment. The Meta Graph API fetches
 * the Reel by URL, so the asset must be publicly reachable.
 * When `key` is given the URL is predictable; otherwise a random suffix is added.
 */
export async function uploadAsset(localPath: string, key?: string): Promise<string> {
  const body = await readFile(localPath);
  const pathname = key ?? path.basename(localPath);
  const { url } = await put(pathname, body, {
    access: "public",
    contentType: "video/mp4",
    addRandomSuffix: !key,
    allowOverwrite: true,
  });
  return url;
}

/** Delete Reel MP4s older than maxAgeDays — they are only needed at post time. */
export async function cleanupOldBlobs(maxAgeDays = 3): Promise<number> {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  let deleted = 0;
  let cursor: string | undefined;
  do {
    const res = await list({ cursor, limit: 1000 });
    const old = res.blobs.filter(
      (b) => new Date(b.uploadedAt).getTime() < cutoff
    );
    if (old.length > 0) {
      await del(old.map((b) => b.url));
      deleted += old.length;
    }
    cursor = res.hasMore ? res.cursor : undefined;
  } while (cursor);
  return deleted;
}
