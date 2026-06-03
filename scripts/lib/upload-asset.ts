import { readFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

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
