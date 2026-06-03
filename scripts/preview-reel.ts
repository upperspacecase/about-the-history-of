import path from "node:path";
import { renderReel } from "./lib/render-reel";
import { buildCaption } from "../src/lib/caption";
import type { HistoryDoc } from "../src/lib/history-generate";
import sample from "../remotion/data/sample-history.json";

// Phase 2 smoke test: render the sample story to an MP4 and print its caption.
// No secrets required (does not upload). Run: npx tsx scripts/preview-reel.ts
async function main() {
  const doc = sample as unknown as HistoryDoc;
  const outPath = path.resolve(process.cwd(), "out/reel-sample.mp4");
  console.log("Rendering Reel ->", outPath);
  await renderReel({ doc, source: "New York Times", outPath });
  console.log("\nRendered.\n\n--- IG caption ---\n");
  console.log(buildCaption(doc).igCaption);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
