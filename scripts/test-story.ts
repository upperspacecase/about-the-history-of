// Stage-1 harness: fetch live feeds, cluster, pick one cluster, retrieve its
// evidence, and run the full draft -> critic -> gate path. Prints the result.
// Writes nothing to Firestore and publishes nothing.
//
//     npx tsx scripts/test-story.ts            # biggest cluster
//     npx tsx scripts/test-story.ts gaza aid   # cluster matching these words
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const query = process.argv.slice(2).join(" ").toLowerCase().trim();

async function main() {
  const { fetchAllReports } = await import("../src/lib/feeds");
  const { clusterReports } = await import("../src/lib/select-top-stories");
  const { buildEvidencePackage } = await import("../src/lib/evidence");
  const { generateGatedStory } = await import("../src/lib/story-generate");

  const sweep = await fetchAllReports();
  console.log(
    `Feeds: ${sweep.feedsSucceeded}/${sweep.feedsAttempted} · reports: ${sweep.reports.length}`
  );
  const clusters = clusterReports(sweep.reports);
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

  console.log(`\nCluster (${cluster.sources.join(", ")}):`);
  for (const m of cluster.members) console.log(`  - [${m.source}] ${m.title}`);

  console.log("\nRetrieving evidence…");
  const evidence = await buildEvidencePackage(cluster.members);
  for (const item of evidence.items) {
    console.log(
      `  ${item.id} [${item.accessMode}] ${item.publisher}: ${item.passage.length} chars`
    );
  }
  console.log(`  independent origins: ${evidence.independentOrigins}`);

  console.log("\nDrafting (with web search)…");
  const result = await generateGatedStory(evidence, null);
  console.log("\n=== RESULT ===");
  console.log(JSON.stringify(result, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
