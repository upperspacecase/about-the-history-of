// The daily edition pipeline (PRD v2 §13). Stages, in order and isolated:
//
//   ingest -> cluster -> story resolution -> evidence retrieval ->
//   triage (one cheap call, ranks the pool) ->
//   generation (analysis/verification/revision/headline/critic, rank order,
//   stops at the cut) -> selection ->
//   atomic publication -> email -> reels -> operator report
//
// Selection is material change + relevance, at most 3 cards, no role quotas
// and no minimum (BRF 01-04). A quiet day, a limited-coverage day, and a
// failure produce three different editions. Publication is the single
// edition-document write after every referenced version exists (OPS 01);
// re-runs refuse to silently replace an existing edition (OPS 02). Email
// and Instagram failures stay channel failures (OPS 06).
//
// DRY_RUN=1: full generation and local reel renders, but no writes to
// stories/editions, no email, no Instagram, no delivery ledger (OPS 04).
import { mkdir } from "node:fs/promises";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const POOL_SIZE = 10;
const MAX_STORIES = 3;
const MAX_REELS = 3;
const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
const SITE = "https://thelongview.org";

interface Eligible {
  clusterTitle: string;
  clusterTitles: string[];
  significance: number;
  doc: import("../src/lib/story-generate").StoryDoc;
  verification: import("../src/lib/research").HistoryVerification;
  existing: Awaited<
    ReturnType<typeof import("../src/lib/story-store").findMatchingStory>
  >;
  changeReason?: string;
}

async function main() {
  const { getAdminDb } = await import("../src/lib/firebase/admin");
  const { fetchAllReports } = await import("../src/lib/feeds");
  const { clusterHeadlines } = await import("../src/lib/select-top-stories");
  const { buildEvidencePackage } = await import("../src/lib/evidence");
  const { generateStory, triageStory } = await import(
    "../src/lib/story-generate"
  );
  const { fetchRecentPublishedHeadlines } = await import(
    "../src/lib/recent-headlines"
  );
  const {
    findMatchingStory,
    publishStoryVersion,
    publishEdition,
    getEdition,
  } = await import("../src/lib/story-store");
  const { headlineKey } = await import("../src/lib/history-key");
  const { buildCaption } = await import("../src/lib/caption");
  const { renderReel } = await import("./lib/render-reel");
  const { uploadAsset, cleanupOldBlobs } = await import("./lib/upload-asset");
  const { publishReel } = await import("./lib/meta-publish");
  const { sendDailyDigest } = await import("../src/lib/digest");
  const { sendRunReport } = await import("../src/lib/resend");
  const { ANALYSIS_MODEL, CHECK_MODEL } = await import(
    "../src/lib/research-prompt"
  );
  const { FieldValue } = await import("firebase-admin/firestore");
  type CandidateDecision = import("../src/lib/story-types").CandidateDecision;
  type EditionStatus = import("../src/lib/story-types").EditionStatus;

  const db = getAdminDb();
  await mkdir("out", { recursive: true });

  const editionId = new Date().toISOString().slice(0, 10);
  const runId = `${editionId}-${Date.now().toString(36)}`;
  const startedAt = new Date().toISOString();
  const stages: Record<string, "ok" | "failed" | "skipped"> = {};
  const decisions: CandidateDecision[] = [];
  const errors: string[] = [];

  // OPS 02: idempotency + a lock against concurrent publication races.
  const existingEdition = await getEdition(editionId);
  if (existingEdition) {
    console.log(
      `Edition ${editionId} already published (${existingEdition.status}); nothing to do.`
    );
    return;
  }
  if (!DRY_RUN) {
    const lockRef = db.collection("locks").doc(`edition-${editionId}`);
    try {
      await db.runTransaction(async (tx) => {
        const lock = await tx.get(lockRef);
        const started = lock.data()?.startedAt as string | undefined;
        const fresh =
          started && Date.now() - new Date(started).getTime() < 2 * 60 * 60 * 1000;
        if (lock.exists && fresh) {
          throw new Error(`edition ${editionId} is being published by another run`);
        }
        tx.set(lockRef, { startedAt, runId });
      });
    } catch (err) {
      console.error(String(err));
      process.exit(1);
    }
  }

  // ---- Ingest ----
  const sweep = await fetchAllReports();
  stages.ingest = sweep.reports.length > 0 ? "ok" : "failed";
  const coverage = {
    feedsAttempted: sweep.feedsAttempted,
    feedsSucceeded: sweep.feedsSucceeded,
    candidatesConsidered: 0,
  };
  const limitedCoverage =
    sweep.feedsSucceeded < Math.ceil(sweep.feedsAttempted / 2);
  console.log(
    `Ingest: ${sweep.reports.length} reports from ${sweep.feedsSucceeded}/${sweep.feedsAttempted} feeds`
  );

  const eligible: Eligible[] = [];
  let processingFailures = 0;
  let evidenceInsufficient = 0;

  if (sweep.reports.length === 0) {
    // Feeds failed outright: an unavailable edition, never a quiet one (AT 11).
    stages.generate = "skipped";
  } else {
    // ---- Cluster + resolve + generate ----
    const clusters = clusterHeadlines(sweep.reports, POOL_SIZE);
    coverage.candidatesConsidered = clusters.length;
    const recentHeadlines = await fetchRecentPublishedHeadlines(50);
    stages.cluster = "ok";

    const seenStoryIds = new Set<string>();

    // Pass 1, cheap: resolve, retrieve evidence and triage every cluster
    // with a single call on the check model (no history, no web). This
    // ranks the pool.
    interface Triaged {
      rep: (typeof clusters)[number]["representative"];
      clusterTitles: string[];
      match: Awaited<ReturnType<typeof findMatchingStory>>;
      evidence: Extract<
        Awaited<ReturnType<typeof buildEvidencePackage>>,
        { ok: true }
      >["evidence"];
      previousAccount: import("../src/lib/story-generate").StoryGenerationInput["previousAccount"];
      significance: number;
    }
    const triaged: Triaged[] = [];

    for (const cluster of clusters) {
      const rep = cluster.representative;
      const clusterTitles = cluster.members.map((m) => m.title);
      try {
        const match = await findMatchingStory(cluster.members);

        // Deduplicate final selections at the story level (§6).
        if (match && seenStoryIds.has(match.story.id)) {
          decisions.push({
            clusterTitle: rep.title,
            storyId: match.story.id,
            outcome: "already-covered",
            reason: "another cluster already resolved to this story today",
          });
          continue;
        }

        const evidence = await buildEvidencePackage(cluster.members, rep);
        if (!evidence.ok) {
          evidenceInsufficient++;
          decisions.push({
            clusterTitle: rep.title,
            outcome: "evidence-insufficient",
            reason: evidence.rejected,
          });
          continue;
        }

        const prev = match?.latestVersion.doc;
        const previousAccount = prev
          ? {
              editorialHeadline: prev.truthHeadline,
              whatChanged: prev.whatChanged ?? prev.summary ?? "",
              background: prev.background ?? "",
              publishedAt: match!.latestVersion.publishedAt,
            }
          : null;

        const triage = await triageStory({
          evidence: evidence.evidence,
          previousAccount,
        });
        if (triage.status === "no-material-change") {
          decisions.push({
            clusterTitle: rep.title,
            storyId: match?.story.id,
            outcome: "no-material-change",
            reason: triage.reason,
          });
          if (match) seenStoryIds.add(match.story.id);
          continue;
        }

        if (match) seenStoryIds.add(match.story.id);
        triaged.push({
          rep,
          clusterTitles,
          match,
          evidence: evidence.evidence,
          previousAccount,
          significance: triage.significance,
        });
        console.log(
          `Triaged: "${rep.title}" (internal ${triage.significance}/10)`
        );
      } catch (err) {
        processingFailures++;
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`"${rep.title}": ${msg}`);
        decisions.push({
          clusterTitle: rep.title,
          outcome: "processing-failed",
          reason: msg.slice(0, 300),
        });
      }
    }

    // Pass 2, expensive: full generation (analysis, verification, revision,
    // headline, critic) in triage rank order, stopping once the edition is
    // full. A withheld story hands its slot to the next in rank.
    triaged.sort((a, b) => b.significance - a.significance);
    for (const t of triaged) {
      if (eligible.length >= MAX_STORIES) {
        decisions.push({
          clusterTitle: t.rep.title,
          storyId: t.match?.story.id,
          outcome: "outside-scope",
          reason: "ranked below the edition cut",
        });
        continue;
      }
      try {
        const result = await generateStory({
          evidence: t.evidence,
          recentHeadlines,
          // The briefing shows the uncertainty on every card, so
          // low-confidence stories publish with it rather than vanish.
          allowLowConfidence: true,
          previousAccount: t.previousAccount,
        });

        if (result.status === "no-material-change") {
          decisions.push({
            clusterTitle: t.rep.title,
            storyId: t.match?.story.id,
            outcome: "no-material-change",
            reason: result.reason,
          });
          continue;
        }
        if (result.status === "withheld") {
          evidenceInsufficient++;
          decisions.push({
            clusterTitle: t.rep.title,
            storyId: t.match?.story.id,
            outcome: "evidence-insufficient",
            reason: result.reasons.join("; ").slice(0, 500),
          });
          continue;
        }

        eligible.push({
          clusterTitle: t.rep.title,
          clusterTitles: t.clusterTitles,
          significance: result.doc.significance,
          doc: result.doc,
          verification: result.verification,
          existing: t.match,
          changeReason: result.changeReason,
        });
        recentHeadlines.unshift(result.doc.truthHeadline);
        console.log(
          `Eligible: "${result.doc.truthHeadline}" (internal ${result.doc.significance}/10)`
        );
      } catch (err) {
        processingFailures++;
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`"${t.rep.title}": ${msg}`);
        decisions.push({
          clusterTitle: t.rep.title,
          outcome: "processing-failed",
          reason: msg.slice(0, 300),
        });
      }
    }
    stages.generate = processingFailures === coverage.candidatesConsidered && coverage.candidatesConsidered > 0 ? "failed" : "ok";
  }

  // ---- Selection: rank the generated pool, cut (§6). ----
  const ranked = [...eligible].sort((a, b) => b.significance - a.significance);
  const selected = ranked.slice(0, MAX_STORIES);
  for (const e of ranked.slice(MAX_STORIES)) {
    decisions.push({
      clusterTitle: e.clusterTitle,
      outcome: "outside-scope",
      reason: "ranked below the edition cut",
    });
  }
  for (const e of selected) {
    decisions.push({
      clusterTitle: e.clusterTitle,
      storyId: e.existing?.story.id,
      outcome: "selected",
      reason: e.changeReason ?? "material development with adequate support",
    });
  }

  // ---- Edition state (BRF 04) ----
  let status: EditionStatus;
  if (selected.length > 0) {
    status = limitedCoverage ? "partial" : "published";
  } else if (
    sweep.reports.length > 0 &&
    processingFailures === 0 &&
    evidenceInsufficient === 0 &&
    !limitedCoverage
  ) {
    // Quiet requires a completed review with no unresolved material
    // candidates and sufficient source coverage.
    status = "quiet";
  } else {
    status = "unavailable";
  }
  console.log(
    `Selection: ${selected.length} selected; status ${status}; withheld-for-evidence ${evidenceInsufficient}; failures ${processingFailures}`
  );

  // ---- Atomic publication (OPS 01) ----
  const published: {
    slug: string;
    versionId: string;
    doc: Eligible["doc"];
  }[] = [];
  let editionPublished = false;

  if (DRY_RUN) {
    stages.publish = "skipped";
    console.log(`[dry-run] Would publish edition ${editionId} (${status}) with ${selected.length} stories.`);
    for (const e of selected) {
      console.log(`[dry-run] Story: ${e.doc.truthHeadline}`);
    }
  } else {
    try {
      for (const e of selected) {
        const ref = await publishStoryVersion({
          doc: e.doc,
          researchSources: e.verification.sources,
          existing: e.existing
            ? { story: e.existing.story, latestVersion: e.existing.latestVersion }
            : null,
          changeReason: e.changeReason,
          entities: e.doc.entities ?? [],
          topics: e.doc.topics ?? [],
          clusterTitles: e.clusterTitles,
        });
        published.push({
          slug: ref.story.slug,
          versionId: ref.version.id,
          doc: e.doc,
        });
      }
      await publishEdition({
        dateId: editionId,
        status,
        storyVersionIds: published.map((p) => p.versionId),
        coverage,
      });
      editionPublished = true;
      stages.publish = "ok";
      console.log(`Published edition ${editionId} (${status}).`);
    } catch (err) {
      stages.publish = "failed";
      errors.push(`publication: ${err instanceof Error ? err.message : String(err)}`);
      console.error("Publication failed:", err);
    }
  }

  // ---- Email (independent channel; never sent for a failed run) ----
  let digestSummary = "skipped";
  if (DRY_RUN || !editionPublished) {
    stages.email = "skipped";
  } else if (status === "unavailable") {
    // Do not send a quiet-day email for a processing failure (§10).
    stages.email = "skipped";
    digestSummary = "skipped (unavailable edition)";
  } else {
    try {
      const edition = await getEdition(editionId);
      const result = await sendDailyDigest(
        {
          id: editionId,
          readingMinutes: edition?.readingMinutes ?? 1,
          quiet: status === "quiet",
          limitedCoverage: status === "partial",
        },
        published.map((p) => ({
          editorialHeadline: p.doc.truthHeadline,
          whatChanged: p.doc.whatChanged ?? p.doc.summary ?? "",
          whyItMatters: p.doc.whyItMattersNow ?? "",
          uncertainty: (p.doc.uncertainties ?? [])[0],
          versionUrl: `${SITE}/story/${p.slug}?version=${encodeURIComponent(p.versionId)}`,
        }))
      );
      digestSummary = `sent ${result.sent}, failed ${result.failed}, skipped ${result.skipped}`;
      stages.email = result.failed > 0 && result.sent === 0 ? "failed" : "ok";
      console.log(`Digest: ${digestSummary}`);
    } catch (err) {
      stages.email = "failed";
      errors.push(`email: ${err instanceof Error ? err.message : String(err)}`);
      console.error("Digest error:", err);
    }
  }

  // ---- Reels (independent channel; no quota posting) ----
  let posted = 0;
  const reelFailures: string[] = [];
  const reelTargets = DRY_RUN
    ? selected.slice(0, MAX_REELS).map((e) => ({
        slug: "dry-run",
        versionId: `dry-${headlineKey(e.doc.headline)}`,
        doc: e.doc,
      }))
    : published.slice(0, MAX_REELS);

  if (reelTargets.length === 0) {
    stages.reels = "skipped";
  } else {
    for (const target of reelTargets) {
      const legacyId = headlineKey(target.doc.headline);
      try {
        const outPath = `out/${legacyId}.mp4`;
        await renderReel({
          doc: target.doc,
          source: target.doc.sourcePublisher ?? "The Long View",
          outPath,
        });

        if (DRY_RUN) {
          posted += 1;
          console.log(`[dry-run] Reel rendered locally: ${outPath} (not uploaded, not posted)`);
          continue;
        }

        const ledgerId = `instagram:${editionId}:${target.versionId}`;
        const ledgerRef = db.collection("deliveries").doc(ledgerId);
        const prior = await ledgerRef.get();
        if (prior.exists && prior.data()?.status === "sent") {
          console.log(`Reel already posted for ${target.versionId}; skipping.`);
          continue;
        }

        const blobUrl = await uploadAsset(
          outPath,
          `reels/${editionId}/${legacyId}.mp4`
        );
        const { igCaption } = buildCaption(
          target.doc,
          `/story/${target.slug}`
        );
        const ids = await publishReel({ videoUrl: blobUrl, igCaption });

        if (!ids.instagramMediaId) {
          const msg = `Reel failed for "${target.doc.truthHeadline}": ${ids.errors.join("; ")}`;
          reelFailures.push(msg);
          await ledgerRef.set({
            id: ledgerId,
            editionId,
            versionId: target.versionId,
            channel: "instagram",
            status: "failed",
            attempts: ((prior.data()?.attempts as number) ?? 0) + 1,
            updatedAt: new Date().toISOString(),
          });
          continue;
        }

        await ledgerRef.set({
          id: ledgerId,
          editionId,
          versionId: target.versionId,
          channel: "instagram",
          status: "sent",
          attempts: ((prior.data()?.attempts as number) ?? 0) + 1,
          providerReceipt: ids.instagramMediaId,
          updatedAt: new Date().toISOString(),
        });
        // Keep the legacy posts record: the insights collector reads it.
        await db.collection("posts").doc(legacyId).set({
          headline: target.doc.headline,
          storyVersionId: target.versionId,
          blobUrl,
          instagramMediaId: ids.instagramMediaId,
          errors: ids.errors,
          postedAt: FieldValue.serverTimestamp(),
        });
        posted += 1;
        console.log(`Posted reel: "${target.doc.truthHeadline}" (ig ${ids.instagramMediaId})`);
      } catch (err) {
        const msg = `Reel failed for "${target.doc.truthHeadline}": ${err instanceof Error ? err.message : String(err)}`;
        reelFailures.push(msg);
        console.error(msg);
      }
    }
    stages.reels =
      reelFailures.length > 0 && posted === 0 ? "failed" : "ok";
    errors.push(...reelFailures);
  }

  if (!DRY_RUN) {
    try {
      const cleaned = await cleanupOldBlobs();
      if (cleaned > 0) console.log(`Cleaned up ${cleaned} old Reel blob(s).`);
    } catch (err) {
      console.error("Blob cleanup error:", err);
    }
  }

  // ---- Run record (OPS 05) ----
  await db.collection("pipelineRuns").doc(runId).set({
    id: runId,
    editionId,
    startedAt,
    finishedAt: new Date().toISOString(),
    stages,
    feedCoverage: {
      attempted: sweep.feedsAttempted,
      succeeded: sweep.feedsSucceeded,
    },
    // Firestore rejects undefined values; storyId is absent for new stories.
    decisions: decisions.map(({ storyId, ...d }) =>
      storyId ? { ...d, storyId } : d
    ),
    errors,
    dryRun: DRY_RUN,
    model: `${ANALYSIS_MODEL} / ${CHECK_MODEL}`,
  });
  if (!DRY_RUN) {
    await db.collection("locks").doc(`edition-${editionId}`).delete();
  }

  // ---- Operator report ----
  const opsEmail = process.env.OPS_EMAIL;
  const summary = [
    `Edition ${editionId}: ${DRY_RUN ? "DRY RUN, " : ""}${editionPublished || DRY_RUN ? status : "PUBLICATION FAILED"}`,
    `Stories: ${selected.length} selected of ${coverage.candidatesConsidered} clusters (${eligible.length} eligible)`,
    `Feeds: ${sweep.feedsSucceeded}/${sweep.feedsAttempted}`,
    `Email: ${digestSummary}`,
    `Reels: ${posted}/${reelTargets.length}`,
    "",
    "Decisions:",
    ...decisions.map((d) => `- [${d.outcome}] ${d.clusterTitle}: ${d.reason}`),
    ...(errors.length > 0 ? ["", "Errors:", ...errors.map((e) => `- ${e}`)] : []),
  ].join("\n");
  console.log(`\n${summary}`);

  if (!DRY_RUN && opsEmail) {
    try {
      await sendRunReport({
        to: opsEmail,
        subject: `[Long View] ${editionId}: ${editionPublished ? status : "FAILED"} · ${selected.length} stories · reels ${posted}/${reelTargets.length}`,
        body: summary,
      });
    } catch (err) {
      console.error("Run report send failed:", err);
    }
  }

  // Red CI when the edition itself failed to publish (distinct from
  // channel failures, which are reported but non-fatal — OPS 06).
  if (!DRY_RUN && !editionPublished) {
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
