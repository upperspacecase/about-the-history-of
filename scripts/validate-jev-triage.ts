// Offline check: would Jev have kept the stories a past edition actually
// published? Reads a local fixture or Firestore pipelineRuns, calls Jev,
// prints recall@K. Does not publish, email, post, or write Firestore.
//
//   npx tsx scripts/validate-jev-triage.ts --self-test
//   npx tsx scripts/validate-jev-triage.ts --fixture editions.json
//   npx tsx scripts/validate-jev-triage.ts --firestore --limit 14
//
// Needs TYPESAFE_API_KEY for anything except --self-test. Exit 0 when mean
// recall@K is at least --min-recall (default 0.7 at K=3). Exit 1 when the
// bar is missed. Exit 2 on usage or setup errors.
//
// Fixture shape:
// {
//   "editions": [{
//     "editionId": "2026-09-24",
//     "candidates": [{
//       "id": "optional-stable-id",
//       "title": "Cluster headline",
//       "publishers": ["BBC News"],
//       "snippets": ["BBC News: Cluster headline"],
//       "selected": true,
//       "significance": 7
//     }]
//   }]
// }
//
// Firestore mode uses pipelineRuns.decisions. Those records store the
// cluster title and the outcome, not the evidence package, so the Jev state
// is the title alone. significance is absent there; Spearman is reported
// only when a fixture includes it.
import { readFile } from "node:fs/promises";
import { loadEnvConfig } from "@next/env";
import {
  jevGatePassed,
  jevSignificance,
  meanRecall,
  recallAtK,
  spearman,
  type JevTriageDecision,
  type RankedCandidate,
} from "../src/lib/jev-rank";
import {
  maxStories,
  siteOnly,
  skipReels,
  skipSubscriberEmail,
  triageProvider,
  jevNoulThreshold,
} from "../src/lib/edition-flags";

interface FixtureCandidate {
  id?: string;
  title?: string;
  publishers?: string[];
  snippets?: string[];
  selected?: boolean;
  significance?: number;
  previousAccount?: {
    editorialHeadline: string;
    whatChanged: string;
    publishedAt: string;
  } | null;
}

interface FixtureEdition {
  editionId?: string;
  candidates?: FixtureCandidate[];
}

interface EditionCase {
  editionId: string;
  candidates: Array<{
    id: string;
    title: string;
    publishers: string[];
    snippets: string[];
    selected: boolean;
    significance?: number;
    previousAccount?: FixtureCandidate["previousAccount"];
  }>;
}

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

function assert(cond: boolean, message: string): void {
  if (!cond) {
    console.error(`self-test failed: ${message}`);
    process.exit(1);
  }
}

function runSelfTest(): void {
  const empty: { [key: string]: string | undefined } = {};
  assert(maxStories(empty) === 3, "default story cap");
  assert(triageProvider(empty) === "claude", "default triage provider");
  assert(siteOnly(empty) === false, "site-only default off");
  assert(skipReels(empty) === false, "reels default on");
  assert(skipSubscriberEmail(empty) === false, "email default on");
  assert(jevNoulThreshold(empty) === 0.55, "default noul threshold");
  assert(maxStories({ MAX_STORIES: "2" }) === 2, "cap 2");
  assert(maxStories({ MAX_STORIES: "9" }) === 3, "invalid cap stays 3");
  assert(maxStories({ MAX_STORIES: "0" }) === 3, "zero cap stays 3");
  assert(triageProvider({ TRIAGE_PROVIDER: "jev" }) === "jev", "jev on");
  assert(triageProvider({ TRIAGE_PROVIDER: "Jev" }) === "jev", "jev case");
  assert(triageProvider({ TRIAGE_PROVIDER: "nope" }) === "claude", "unknown provider");
  assert(siteOnly({ SITE_ONLY: "1" }) === true, "site only 1");
  assert(siteOnly({ SITE_ONLY: "true" }) === true, "site only true");
  assert(siteOnly({ CHANNELS: "site" }) === true, "channels site");
  assert(siteOnly({ SITE_ONLY: "false" }) === false, "site only false string");
  assert(skipReels({ SKIP_REELS: "1" }) === true, "skip reels");
  assert(skipReels({ SITE_ONLY: "true" }) === true, "site only skips reels");
  assert(
    skipSubscriberEmail({ SKIP_SUBSCRIBER_EMAIL: "1" }) === true,
    "skip email"
  );
  assert(
    skipSubscriberEmail({ OPS_EMAIL_ONLY: "true" }) === true,
    "ops email only skips digest"
  );
  assert(skipReels({ SKIP_REELS: "1" }) && !siteOnly({ SKIP_REELS: "1" }), "reels flag is not site-only");

  const high = { worthNoul: 0.9, importanceScore: 2 };
  assert(jevGatePassed(high, 0.55) === true, "gate pass");
  assert(jevGatePassed({ worthNoul: 0.549 }, 0.55) === false, "gate fail");
  assert(
    jevSignificance({ worthNoul: 0.99, importanceScore: 1 }) <
      jevSignificance({ worthNoul: 0.1, importanceScore: 2 }),
    "importance outranks noul"
  );
  // Theme is not an argument of jevSignificance, so it cannot move the rank.
  assert(jevSignificance(high) > jevSignificance({ worthNoul: 0.9, importanceScore: 1 }), "higher importance ranks first");

  const pool: RankedCandidate[] = [
    { id: "a", selected: true, passed: true, rankScore: 8 },
    { id: "b", selected: true, passed: true, rankScore: 6 },
    { id: "c", selected: true, passed: false, rankScore: 9 },
    { id: "d", selected: false, passed: true, rankScore: 7 },
  ];
  const recall = recallAtK(pool, 3);
  // Passers in order: a (8), d (7), b (6). Selected hits a and b, misses c. 2/3.
  assert(recall !== null && Math.abs(recall - 2 / 3) < 1e-9, "gated recall@3");
  assert(recallAtK([{ id: "q", selected: false, passed: true, rankScore: 1 }], 3) === null, "quiet day");

  const mean = meanRecall([1, null, 0.5]);
  assert(mean.days === 2 && Math.abs(mean.mean - 0.75) < 1e-9, "mean skips quiet days");

  const rho = spearman([1, 2, 3, 4], [1, 2, 3, 4]);
  const rhoNeg = spearman([1, 2, 3, 4], [4, 3, 2, 1]);
  assert(rho !== null && Math.abs(rho - 1) < 1e-9, "spearman +1");
  assert(rhoNeg !== null && Math.abs(rhoNeg + 1) < 1e-9, "spearman -1");
  assert(spearman([1, 1, 1], [1, 2, 3]) === null, "spearman no variance");

  console.log("self-test ok");
  console.log("flags default: maxStories=3 triage=claude siteOnly=false skipReels=false skipSubscriberEmail=false");
}

function asEdition(raw: FixtureEdition, index: number): EditionCase {
  const editionId = raw.editionId?.trim() || `edition-${index + 1}`;
  const candidates = (raw.candidates ?? []).flatMap((c, i) => {
    const title = c.title?.trim();
    if (!title) return [];
    return [
      {
        id: c.id?.trim() || `${editionId}:${i}:${title}`,
        title,
        publishers: (c.publishers ?? []).filter((p) => typeof p === "string"),
        snippets: (c.snippets ?? []).filter((s) => typeof s === "string"),
        selected: c.selected === true,
        significance:
          typeof c.significance === "number" && Number.isFinite(c.significance)
            ? c.significance
            : undefined,
        previousAccount: c.previousAccount ?? null,
      },
    ];
  });
  return { editionId, candidates };
}

async function loadFixture(path: string): Promise<EditionCase[]> {
  const text = await readFile(path, "utf8");
  const parsed = JSON.parse(text) as { editions?: FixtureEdition[] };
  if (!Array.isArray(parsed.editions) || parsed.editions.length === 0) {
    fail(`Fixture ${path} has no editions array.`);
  }
  return parsed.editions.map(asEdition).filter((e) => e.candidates.length > 0);
}

async function loadFirestore(limit: number): Promise<EditionCase[]> {
  const { getAdminDb } = await import("../src/lib/firebase/admin");
  const db = getAdminDb();
  const snap = await db
    .collection("pipelineRuns")
    .orderBy("startedAt", "desc")
    .limit(Math.min(limit * 4, 80))
    .get();

  const editions: EditionCase[] = [];
  const seen = new Set<string>();
  for (const doc of snap.docs) {
    if (editions.length >= limit) break;
    const data = doc.data() as {
      dryRun?: boolean;
      editionId?: string;
      decisions?: Array<{ clusterTitle?: string; outcome?: string }>;
    };
    if (data.dryRun === true) continue;
    const editionId = data.editionId?.trim();
    if (!editionId || seen.has(editionId)) continue;
    seen.add(editionId);
    const decisions = Array.isArray(data.decisions) ? data.decisions : [];
    const candidates = decisions.flatMap((d, i) => {
      const title = d.clusterTitle?.trim();
      if (!title) return [];
      return [
        {
          id: `${editionId}:${i}:${title}`,
          title,
          publishers: [] as string[],
          snippets: [] as string[],
          selected: d.outcome === "selected",
          significance: undefined,
          previousAccount: null,
        },
      ];
    });
    if (candidates.length === 0) continue;
    editions.push({ editionId, candidates });
  }
  return editions;
}

async function main(): Promise<void> {
  if (hasFlag("--self-test")) {
    runSelfTest();
    return;
  }

  const fixture = argValue("--fixture");
  const useFirestore = hasFlag("--firestore");
  if (!fixture && !useFirestore) {
    fail(
      "Pass --self-test, --fixture <file.json>, or --firestore. This script never publishes or sends email."
    );
  }
  if (fixture && useFirestore) {
    fail("Pass only one of --fixture or --firestore.");
  }

  loadEnvConfig(process.cwd());
  if (!process.env.TYPESAFE_API_KEY?.trim()) {
    fail("TYPESAFE_API_KEY is not set. Refusing to call Jev.");
  }

  const k = Number(argValue("--k") ?? "3");
  const minRecall = Number(argValue("--min-recall") ?? "0.7");
  const limit = Number(argValue("--limit") ?? "14");
  if (!Number.isInteger(k) || k < 1) fail("--k must be a positive integer");
  if (!Number.isFinite(minRecall) || minRecall < 0 || minRecall > 1) {
    fail("--min-recall must be between 0 and 1");
  }
  if (!Number.isInteger(limit) || limit < 1) fail("--limit must be a positive integer");

  const threshold = jevNoulThreshold();
  const editions = fixture
    ? await loadFixture(fixture)
    : await loadFirestore(limit);
  if (editions.length === 0) {
    fail("No editions to score.");
  }

  const { triageClusterWithJev, redactError } = await import(
    "../src/lib/jev-triage"
  );

  console.log(
    `Jev validation: ${editions.length} edition(s), K=${k}, noul>=${threshold}, min recall ${minRecall}`
  );
  console.log("No publish, no email, no reel.");

  const recalls: Array<number | null> = [];
  const ungatedRecalls: Array<number | null> = [];
  const spearmanX: number[] = [];
  const spearmanY: number[] = [];
  let inputTokens = 0;
  const misses: string[] = [];

  for (const edition of editions) {
    const ranked: RankedCandidate[] = [];
    for (const candidate of edition.candidates) {
      let decision: JevTriageDecision;
      try {
        decision = await triageClusterWithJev({
          title: candidate.title,
          publishers: candidate.publishers,
          snippets:
            candidate.snippets.length > 0
              ? candidate.snippets
              : candidate.publishers.map((p) => `${p}: ${candidate.title}`),
          previousAccount: candidate.previousAccount,
        });
      } catch (err) {
        console.error(
          `${edition.editionId} "${candidate.title}": Jev error: ${redactError(err)}`
        );
        process.exit(2);
      }
      inputTokens += decision.inputTokens ?? 0;
      const passed = jevGatePassed(decision, threshold);
      ranked.push({
        id: candidate.id,
        selected: candidate.selected,
        passed,
        rankScore: jevSignificance(decision),
        significance: candidate.significance,
        importanceScore: decision.importanceScore,
      });
      if (typeof candidate.significance === "number") {
        spearmanX.push(decision.importanceScore);
        spearmanY.push(candidate.significance);
      }
    }

    const recall = recallAtK(ranked, k);
    const ungated = recallAtK(
      ranked.map((c) => ({ ...c, passed: true })),
      k
    );
    recalls.push(recall);
    ungatedRecalls.push(ungated);
    const label =
      recall === null ? "quiet (skipped)" : `recall@${k}=${recall.toFixed(2)}`;
    console.log(`${edition.editionId}: ${label} (${ranked.length} candidates)`);

    if (recall !== null && recall < 1) {
      const top = new Set(
        ranked
          .filter((c) => c.passed)
          .sort((a, b) => b.rankScore - a.rankScore)
          .slice(0, k)
          .map((c) => c.id)
      );
      for (const c of ranked) {
        if (c.selected && !top.has(c.id)) {
          const title = edition.candidates.find((x) => x.id === c.id)?.title;
          misses.push(
            `${edition.editionId}: published but not in Jev top ${k}: ${title}`
          );
        }
      }
    }
  }

  const gated = meanRecall(recalls);
  const ungated = meanRecall(ungatedRecalls);
  const rho = spearman(spearmanX, spearmanY);
  const estUsd = (inputTokens / 1_000_000) * 0.042;

  console.log("");
  console.log(
    `Mean recall@${k} (Noul gate): ${gated.mean.toFixed(3)} over ${gated.days} edition(s) with a published story`
  );
  console.log(
    `Mean recall@${k} (ignore gate, rank only): ${ungated.mean.toFixed(3)}`
  );
  console.log(
    rho === null
      ? "Spearman vs stored significance: n/a"
      : `Spearman vs stored significance: ${rho.toFixed(3)} (n=${spearmanX.length})`
  );
  console.log(
    `Jev input tokens: ${inputTokens} (about $${estUsd.toFixed(4)} at $0.042 / MTok, output free)`
  );
  if (misses.length > 0) {
    console.log("");
    console.log("Disagreements (published stories Jev would not have written up):");
    for (const line of misses.slice(0, 30)) console.log(`- ${line}`);
  }

  if (gated.days === 0) {
    console.error("No edition had a selected story to score.");
    process.exit(2);
  }
  if (gated.mean + 1e-9 < minRecall) {
    console.error(
      `Below bar: recall@${k} ${gated.mean.toFixed(3)} < ${minRecall}`
    );
    process.exit(1);
  }
  console.log(`Pass: recall@${k} ${gated.mean.toFixed(3)} >= ${minRecall}`);
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(msg.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 300));
  process.exit(2);
});
