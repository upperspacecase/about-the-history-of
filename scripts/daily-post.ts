import { mkdir } from "node:fs/promises";
import { FieldValue } from "firebase-admin/firestore";
import { selectTopStories } from "../src/lib/select-top-stories";
import { generateHistory, type HistoryDoc } from "../src/lib/history-generate";
import { headlineKey } from "../src/lib/history-key";
import { getAdminDb } from "../src/lib/firebase/admin";
import { buildCaption } from "../src/lib/caption";
import { renderReel } from "./lib/render-reel";
import { uploadAsset, cleanupOldBlobs } from "./lib/upload-asset";
import { publishReel } from "./lib/meta-publish";
import { sendDailyDigest } from "../src/lib/digest";
import type { Headline } from "../src/lib/feeds";

const POOL_SIZE = 12;
const POST_COUNT = 3;
// Render + upload the reels but skip Instagram + email. Set on a manual run to
// preview the day's output, or as a kill-switch.
const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

async function main() {
  const db = getAdminDb();
  await mkdir("out", { recursive: true });
  const candidates = await selectTopStories(POOL_SIZE);

  const stories: { candidate: Headline; doc: HistoryDoc }[] = [];
  for (const candidate of candidates) {
    const id = headlineKey(candidate.title);
    const ref = db.collection("histories").doc(id);
    const snap = await ref.get();
    let doc: HistoryDoc;
    if (snap.exists) {
      doc = snap.data() as HistoryDoc;
    } else {
      doc = await generateHistory(candidate.title);
      await ref.set({
        ...doc,
        generatedBy: "cron",
        generatedAt: FieldValue.serverTimestamp(),
      });
    }
    stories.push({ candidate, doc });
  }

  stories.sort((a, b) => b.doc.significance - a.doc.significance);

  const fresh: { candidate: Headline; doc: HistoryDoc }[] = [];
  for (const story of stories) {
    const id = headlineKey(story.candidate.title);
    const posted = await db.collection("posts").doc(id).get();
    if (!posted.exists) fresh.push(story);
  }

  const selected = fresh.slice(0, POST_COUNT);

  let posted = 0;
  for (const { candidate, doc } of selected) {
    const id = headlineKey(candidate.title);
    try {
      const outPath = `out/${id}.mp4`;
      await renderReel({ doc, source: candidate.source, outPath });

      const dateKey = new Date().toISOString().slice(0, 10);
      const blobUrl = await uploadAsset(outPath, `reels/${dateKey}/${id}.mp4`);

      const { igCaption } = buildCaption(doc);

      if (DRY_RUN) {
        posted += 1;
        console.log(`[dry-run] Reel ready, not posted: ${blobUrl}`);
        console.log(`[dry-run] Caption:\n${igCaption}\n`);
        continue;
      }

      const ids = await publishReel({ videoUrl: blobUrl, igCaption });

      if (!ids.instagramMediaId) {
        console.error(`Failed to post "${candidate.title}": ${ids.errors.join("; ")}`);
        continue;
      }

      await db.collection("posts").doc(id).set({
        headline: candidate.title,
        blobUrl,
        instagramMediaId: ids.instagramMediaId,
        errors: ids.errors,
        postedAt: FieldValue.serverTimestamp(),
      });

      posted += 1;
      console.log(
        `Posted: "${candidate.title}" (ig ${ids.instagramMediaId})` +
          (ids.errors.length ? ` [errors: ${ids.errors.join("; ")}]` : "")
      );
    } catch (err) {
      console.error(`Failed to post "${candidate.title}":`, err);
    }
  }

  const digestStories = selected.map(({ candidate, doc }) => ({
    headline: candidate.title,
    truthHeadline: doc.truthHeadline,
    significance: doc.significance,
    significanceReason: doc.significanceReason,
  }));
  if (DRY_RUN) {
    console.log(
      `[dry-run] Would send digest for ${digestStories.length} story(ies); skipped.`
    );
  } else {
    try {
      const { sent, failed } = await sendDailyDigest(digestStories);
      console.log(`Digest sent to ${sent} subscriber(s); ${failed} failed.`);
    } catch (err) {
      console.error("Digest send error:", err);
    }
  }

  try {
    const cleaned = await cleanupOldBlobs();
    if (cleaned > 0) console.log(`Cleaned up ${cleaned} old Reel blob(s).`);
  } catch (err) {
    console.error("Blob cleanup error:", err);
  }

  const skippedAlreadyPosted = stories.length - fresh.length;
  console.log(
    `Done${DRY_RUN ? " (dry-run)" : ""}. ` +
      `${DRY_RUN ? "Rendered" : "Posted"} ${posted}/${selected.length}; ` +
      `skipped ${skippedAlreadyPosted} already-posted.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
