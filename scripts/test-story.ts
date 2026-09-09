// Pipeline harness: fetch live feeds, cluster, pick one cluster, retrieve
// its evidence, and run the full research -> analysis -> headline -> critic
// path. Prints the result. Writes nothing to Firestore, publishes nothing.
//
//     npx tsx scripts/test-story.ts            # biggest cluster
//     npx tsx scripts/test-story.ts gaza aid   # cluster matching these words
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const query = process.argv.slice(2).join(" ").toLowerCase().trim();

async function main() {
  const { selectTopClusters } = await import("../src/lib/select-top-stories");
  const { buildEvidencePackage } = await import("../src/lib/evidence");
  const { generateStory } = await import("../src/lib/story-generate");

  const clusters = await selectTopClusters(30);
  console.log(`Clusters: ${clusters.length}`);

  const cluster = query
    ? clusters.find((c) =>
        c.members.some((m) => m.title.toLowerCase().includes(query))
      )
    : clusters[0];
  if (!cluster) {
    console.error(`No cluster matching "${query}"`);
    process.exit(1);
  }

  console.log(`\nCluster (${cluster.publisherCount} publishers):`);
  for (const m of cluster.members) console.log(`  - [${m.source}] ${m.title}`);

  console.log("\nRetrieving evidence…");
  const result = await buildEvidencePackage(cluster.members, cluster.representative);
  if (!result.ok) {
    console.log(`Rejected before analysis: ${result.rejected}`);
    process.exit(0);
  }
  for (const p of result.evidence.passages) {
    console.log(`  [${p.accessMode}] ${p.publisher}: ${p.text.length} chars`);
  }
  console.log(
    `  publishers: ${result.evidence.independentPublisherCount} · origins: ${result.evidence.independentOriginCount}`
  );

  console.log("\nGenerating (research + analysis + headline + critic)…");
  const story = await generateStory({
    evidence: result.evidence,
    recentHeadlines: [],
    allowLowConfidence: true,
  });

  console.log("\n=== RESULT ===");
  if (story.status === "withheld") {
    console.log(JSON.stringify(story, null, 2));
  } else {
    console.log(
      JSON.stringify(
        {
          status: story.status,
          researchSources: story.research.sources.length,
          researchDiscarded: story.research.discardedSources,
          doc: story.doc,
        },
        null,
        2
      )
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
