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
import { sendRunReport } from "../src/lib/resend";
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
  const failures: string[] = [];
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
        const msg = `Failed to post "${candidate.title}": ${ids.errors.join("; ")}`;
        console.error(msg);
        failures.push(msg);
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
      const msg = `Failed to post "${candidate.title}": ${err instanceof Error ? err.message : String(err)}`;
      console.error(msg);
      failures.push(msg);
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

  // Email the run outcome to the operator. Single recipient from OPS_EMAIL
  // (never the subscriber list). Sent on every scheduled run so a silent day
  // or an error both stand out in the inbox.
  const opsEmail = process.env.OPS_EMAIL;
  if (opsEmail && !DRY_RUN) {
    const failed = selected.length > 0 && posted === 0;
    const subject = failed
      ? `[Long View] FAILED — 0/${selected.length} posted`
      : `[Long View] posted ${posted}/${selected.length}`;
    const lines = [
      `Posted ${posted}/${selected.length} reel(s) to Instagram.`,
      `Skipped ${skippedAlreadyPosted} already-posted.`,
    ];
    if (failures.length) lines.push("", "Failures:", ...failures);
    try {
      await sendRunReport({ to: opsEmail, subject, body: lines.join("\n") });
      console.log("Run report emailed to operator.");
    } catch (err) {
      console.error("Run report email failed:", err);
    }
  }

  // Fail the run (red CI + failure notification) when nothing reached Instagram
  // despite having stories to post. The digest and cleanup above still ran.
  if (!DRY_RUN && selected.length > 0 && posted === 0) {
    throw new Error(
      `Instagram publishing failed for all ${selected.length} reel(s) — nothing posted.\n` +
        failures.join("\n")
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
