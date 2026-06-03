import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { HistoryDoc } from "../../src/lib/history-generate";

const here = path.dirname(fileURLToPath(import.meta.url));
const ENTRY = path.resolve(here, "../../remotion/index.ts");

let serveUrlPromise: Promise<string> | null = null;

// Bundle the Remotion project once per process; the daily job renders 3 Reels.
function getServeUrl(): Promise<string> {
  if (!serveUrlPromise) {
    serveUrlPromise = bundle({ entryPoint: ENTRY });
  }
  return serveUrlPromise;
}

export interface RenderReelInput {
  doc: HistoryDoc;
  source?: string;
  outPath: string;
}

/** Render the "Reel" composition (1080x1920 H.264) for one story to outPath. */
export async function renderReel({
  doc,
  source,
  outPath,
}: RenderReelInput): Promise<string> {
  const serveUrl = await getServeUrl();
  const inputProps = { doc, source: source ?? "" };
  const composition = await selectComposition({
    serveUrl,
    id: "Reel",
    inputProps,
  });
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outPath,
    inputProps,
    overwrite: true,
  });
  return outPath;
}
