// Operator tool for the correction workflow (STY 06, §8). Corrections are
// deliberate human actions; the pipeline never calls this.
//
//   Material correction (public note above the affected analysis):
//     npx tsx scripts/correct-story.ts <slug> --note "An earlier version said X. It should have said Y." --reason "internal reason"
//
//   Retraction (analysis withdrawn, story marked retracted):
//     npx tsx scripts/correct-story.ts <slug> --retract "Why it should no longer be relied on." --reason "internal reason"
//
// Both attach to the story's latest published version. The public note is
// reader-facing; write it in the §10 correction format.
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const slug = process.argv[2];
  const note = arg("--note");
  const retract = arg("--retract");
  const reason = arg("--reason") ?? "operator correction";

  if (!slug || (!note && !retract) || (note && retract)) {
    console.error(
      'Usage: npx tsx scripts/correct-story.ts <slug> (--note "public note" | --retract "public note") [--reason "internal reason"]'
    );
    process.exit(1);
  }

  const { getStoryBySlug, recordCorrection } = await import(
    "../src/lib/story-store"
  );

  const story = await getStoryBySlug(slug);
  if (!story) {
    console.error(`No story with slug "${slug}"`);
    process.exit(1);
  }

  const record = await recordCorrection({
    story,
    affectedVersionIds: [story.latestVersionId],
    replacementDoc: null,
    researchSources: [],
    reason,
    publicNote: (note ?? retract)!,
    severity: note ? "material" : "retraction",
  });

  console.log(
    `${record.severity} recorded for "${slug}" (${record.id}), affecting ${story.latestVersionId}.`
  );
  console.log(
    "Check the admin pipeline panel for any open correction tasks on distributed posts."
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
