import { mkdir } from "node:fs/promises";
import { FieldValue } from "firebase-admin/firestore";
import { selectTopClusters } from "../src/lib/select-top-stories";
import { buildEvidencePackage } from "../src/lib/evidence";
import { generateStory, type StoryDoc } from "../src/lib/story-generate";
import { fetchRecentPublishedHeadlines } from "../src/lib/recent-headlines";
import { significanceLabel } from "../src/lib/significance";
import { headlineKey } from "../src/lib/history-key";
import { getAdminDb } from "../src/lib/firebase/admin";
import { buildCaption } from "../src/lib/caption";
import { renderReel } from "./lib/render-reel";
import { uploadAsset, cleanupOldBlobs } from "./lib/upload-asset";
import { publishReel } from "./lib/meta-publish";
import { sendDailyDigest } from "../src/lib/digest";
import { sendRunReport } from "../src/lib/resend";
import type { CardRole } from "../src/lib/history-types";

// How many event clusters to consider each morning.
const POOL_SIZE = 12;
// Stop analysing once this many stories have passed validation; the card
// roles are then chosen from this pool.
const TARGET_VALIDATED = 6;
// The briefing carries at most three stories. Fewer is legitimate: an
// unusually quiet day is a valid and useful conclusion.
const MAX_STORIES = 3;
// Render + upload the reels but skip Instagram + email. Set on a manual run
// to preview the day's output, or as a kill-switch.
const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

interface GeneratedStory {
  id: string;
  doc: StoryDoc;
  coverageVolume: number;
}

/**
 * Assign the three card roles. These are categories, not headline templates:
 * - shift: the event most likely to create durable change.
 * - pattern: an important development following a recognisable historical
 *   mechanism.
 * - noise: a heavily covered event that currently changes less than the
 *   coverage implies.
 * A story that fits no role is not published; the quota is never filled for
 * its own sake.
 */
function assignRoles(
  stories: GeneratedStory[]
): { story: GeneratedStory; role: CardRole }[] {
  const remaining = [...stories];
  const picks: { story: GeneratedStory; role: CardRole }[] = [];

  const take = (story: GeneratedStory | undefined, role: CardRole) => {
    if (!story) return;
    picks.push({ story, role });
    remaining.splice(remaining.indexOf(story), 1);
  };

  // The shift: highest significance, preferring structural classifications.
  const shift = [...remaining]
    .filter((s) => s.doc.significance >= 5)
    .sort((a, b) => {
      const structuralA = ["Structural", "Era-defining", "Accelerating"].includes(
        a.doc.classification ?? ""
      )
        ? 1
        : 0;
      const structuralB = ["Structural", "Era-defining", "Accelerating"].includes(
        b.doc.classification ?? ""
      )
        ? 1
        : 0;
      if (structuralA !== structuralB) return structuralB - structuralA;
      return b.doc.significance - a.doc.significance;
    })[0];
  take(shift, "shift");

  // The pattern: a recognisable historical mechanism with a solid precedent.
  const pattern = [...remaining]
    .filter(
      (s) =>
        s.doc.significance >= 3 &&
        ["Recurring", "Accelerating"].includes(s.doc.classification ?? "")
    )
    .sort((a, b) => b.doc.significance - a.doc.significance)[0];
  take(pattern, "pattern");

  // The noise check: heavy coverage, limited change.
  const noise = [...remaining]
    .filter((s) => s.doc.significance <= 4 && s.coverageVolume >= 3)
    .sort((a, b) => b.coverageVolume - a.coverageVolume)[0];
  take(noise, "noise");

  return picks.slice(0, MAX_STORIES);
}

async function main() {
  const db = getAdminDb();
  await mkdir("out", { recursive: true });

  const clusters = await selectTopClusters(POOL_SIZE);
  const recentHeadlines = await fetchRecentPublishedHeadlines(50);

  const generated: GeneratedStory[] = [];
  const withheld: string[] = [];

  for (const cluster of clusters) {
    if (generated.length >= TARGET_VALIDATED) break;

    const rep = cluster.representative;
    const id = headlineKey(rep.title);

    const alreadyPosted = await db.collection("posts").doc(id).get();
    if (alreadyPosted.exists) continue;

    const ref = db.collection("histories").doc(id);
    const existing = await ref.get();
    const existingData = existing.exists ? (existing.data() as StoryDoc) : null;

    // Reuse a story only when it already carries the full validated format.
    if (existingData?.scoreBreakdown && existingData.truthHeadline) {
      generated.push({
        id,
        doc: existingData,
        coverageVolume: cluster.coverageVolume,
      });
      continue;
    }

    const evidence = buildEvidencePackage(cluster.members, rep);
    if (!evidence.ok) {
      withheld.push(`"${rep.title}": ${evidence.rejected}`);
      continue;
    }

    let result;
    try {
      result = await generateStory({
        evidence: evidence.evidence,
        recentHeadlines,
      });
    } catch (err) {
      withheld.push(
        `"${rep.title}": pipeline error: ${err instanceof Error ? err.message : String(err)}`
      );
      continue;
    }

    if (result.status === "withheld") {
      withheld.push(`"${rep.title}": ${result.reasons.join("; ")}`);
      continue;
    }

    const doc = result.doc;

    // A regeneration over an old-format story is a material update: record
    // it in the visible revision log rather than silently replacing it.
    if (existingData) {
      doc.revisions = [
        ...(existingData.revisions ?? []),
        {
          at: new Date().toISOString(),
          note: "Regenerated under the automated validation pipeline.",
          previousScore: existingData.significance,
          newScore: doc.significance,
        },
      ];
      if (existingData.generatedAtIso) {
        doc.generatedAtIso = existingData.generatedAtIso;
      }
    }

    await ref.set({
      ...doc,
      generatedBy: "cron",
      generatedAt: existing.exists
        ? (existing.data()?.generatedAt ?? FieldValue.serverTimestamp())
        : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    generated.push({ id, doc, coverageVolume: cluster.coverageVolume });
    recentHeadlines.unshift(doc.truthHeadline);
  }

  const picks = assignRoles(generated);
  const dateKey = new Date().toISOString().slice(0, 10);

  for (const { story, role } of picks) {
    await db
      .collection("histories")
      .doc(story.id)
      .set({ cardRole: role }, { merge: true });
  }

  await db
    .collection("briefings")
    .doc(dateKey)
    .set({
      date: dateKey,
      stories: picks.map(({ story, role }) => ({
        id: story.id,
        role,
        sourceHeadline: story.doc.sourceHeadline ?? story.doc.headline,
        verdictHeadline: story.doc.truthHeadline,
        significance: story.doc.significance,
        confidence: story.doc.confidence ?? null,
      })),
      withheldCount: withheld.length,
      generatedAt: FieldValue.serverTimestamp(),
    });

  console.log(
    `Validated ${generated.length} story(ies); publishing ${picks.length}; withheld ${withheld.length}.`
  );
  for (const w of withheld) console.log(`Withheld: ${w}`);

  let posted = 0;
  const failures: string[] = [];
  for (const { story } of picks) {
    const { id, doc } = story;
    const sourceName = doc.sourcePublisher ?? "The Long View";
    try {
      const outPath = `out/${id}.mp4`;
      await renderReel({ doc, source: sourceName, outPath });

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
        const msg = `Failed to post "${doc.headline}": ${ids.errors.join("; ")}`;
        console.error(msg);
        failures.push(msg);
        continue;
      }

      await db.collection("posts").doc(id).set({
        headline: doc.headline,
        blobUrl,
        instagramMediaId: ids.instagramMediaId,
        errors: ids.errors,
        postedAt: FieldValue.serverTimestamp(),
      });

      posted += 1;
      console.log(
        `Posted: "${doc.headline}" (ig ${ids.instagramMediaId})` +
          (ids.errors.length ? ` [errors: ${ids.errors.join("; ")}]` : "")
      );
    } catch (err) {
      const msg = `Failed to post "${doc.headline}": ${err instanceof Error ? err.message : String(err)}`;
      console.error(msg);
      failures.push(msg);
    }
  }

  const digestStories = picks.map(({ story, role }) => ({
    headline: story.doc.sourceHeadline ?? story.doc.headline,
    publisher: story.doc.sourcePublisher,
    truthHeadline: story.doc.truthHeadline,
    significance: story.doc.significance,
    label: significanceLabel(story.doc.significance),
    significanceReason: story.doc.significanceReason,
    confidence: story.doc.confidence,
    role,
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

  console.log(
    `Done${DRY_RUN ? " (dry-run)" : ""}. ` +
      `${DRY_RUN ? "Rendered" : "Posted"} ${posted}/${picks.length}; ` +
      `withheld ${withheld.length}.`
  );

  // Email the run outcome to the operator. Single recipient from OPS_EMAIL
  // (never the subscriber list). Sent on every scheduled run so a silent day
  // or an error both stand out in the inbox.
  const opsEmail = process.env.OPS_EMAIL;
  if (opsEmail && !DRY_RUN) {
    const failed = picks.length > 0 && posted === 0;
    const subject = failed
      ? `[Long View] FAILED: 0/${picks.length} posted`
      : `[Long View] published ${picks.length} story(ies); posted ${posted}/${picks.length} reels`;
    const lines = [
      `Published ${picks.length} story(ies) in the briefing.`,
      `Posted ${posted}/${picks.length} reel(s) to Instagram.`,
      `Withheld ${withheld.length} candidate(s).`,
    ];
    if (withheld.length) lines.push("", "Withheld:", ...withheld);
    if (failures.length) lines.push("", "Failures:", ...failures);
    try {
      await sendRunReport({ to: opsEmail, subject, body: lines.join("\n") });
      console.log("Run report emailed to operator.");
    } catch (err) {
      console.error("Run report email failed:", err);
    }
  }

  // Fail the run (red CI + failure notification) when nothing reached
  // Instagram despite having stories to post. The digest and cleanup above
  // still ran. A zero-story day is NOT a failure: withholding is designed in.
  if (!DRY_RUN && picks.length > 0 && posted === 0) {
    throw new Error(
      `Instagram publishing failed for all ${picks.length} reel(s); nothing posted.\n` +
        failures.join("\n")
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
