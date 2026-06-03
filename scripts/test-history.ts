// Prompt playground: edit src/lib/research-prompt.ts, then run this on any
// headline to see exactly what the AI produces.
//
//     npx tsx scripts/test-history.ts "Your headline here"
//
// Loads .env.local for ANTHROPIC_API_KEY.
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const headline =
  process.argv.slice(2).join(" ") ||
  "Government announces major increase to the minimum wage";

async function main() {
  // Imported after env is loaded so the Anthropic client picks up the key.
  const { generateHistory } = await import("../src/lib/history-generate");
  console.log(`\nHeadline: ${headline}\n`);
  const doc = await generateHistory(headline);
  console.log(JSON.stringify(doc, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
