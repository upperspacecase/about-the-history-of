// Applies a weekly report's recommendations to the two marketing levers, and
// nothing else. Triggered by the apply-recommendations workflow (which is
// dispatched from the admin "Apply" button). Bounded by design:
//
//   - only ever rewrites src/lib/caption.ts and remotion/AnimatedTitleCard.tsx
//   - "caption" recs → caption.ts, "reel" recs → AnimatedTitleCard.tsx
//   - returns the file unchanged if no rec applies, or if the model returns an
//     implausibly short result (truncation guard)
//
// The workflow typechecks the result and only opens a PR if it compiles; a human
// merges. The agent never pushes to main.

import { readFile, writeFile, appendFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { getAdminDb } from "../src/lib/firebase/admin";
import {
  WEEKLY_REPORTS,
  type WeeklyRecommendation,
  type WeeklyReport,
} from "../src/lib/metrics";

interface Target {
  file: string;
  area: WeeklyRecommendation["area"];
  description: string;
}

const TARGETS: Target[] = [
  {
    file: "src/lib/caption.ts",
    area: "caption",
    description:
      "Builds the Instagram caption: the hook lead line, significance framing, the historical 'rhyme' proof line, the CTA, and hashtags.",
  },
  {
    file: "remotion/AnimatedTitleCard.tsx",
    area: "reel",
    description:
      "The Remotion reel card: animation beats/timing constants, font sizes, kicker styling, and what text is emphasised.",
  },
];

const SYSTEM_PROMPT = `You are a senior TypeScript engineer editing ONE file in the The Long View codebase to apply this week's marketing recommendations.

Rules:
- Apply ONLY changes that are clearly supported by the recommendations AND relevant to THIS file.
- Keep every other line, import, export, type, and behaviour identical.
- Make minimal, surgical edits (tune constants, copy, thresholds). Do not refactor, rename, or restructure.
- Do not add comments that narrate the change.
- Return ONLY the complete updated file contents — no markdown fences, no commentary.
- If no recommendation meaningfully applies to this file, return the file exactly unchanged.`;

async function getReport(weekArg?: string): Promise<WeeklyReport | null> {
  const db = getAdminDb();
  if (weekArg) {
    const snap = await db.collection(WEEKLY_REPORTS).doc(weekArg).get();
    return snap.exists ? (snap.data() as WeeklyReport) : null;
  }
  const snap = await db
    .collection(WEEKLY_REPORTS)
    .orderBy("week", "desc")
    .limit(1)
    .get();
  return snap.empty ? null : (snap.docs[0].data() as WeeklyReport);
}

function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:[a-z]+)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

async function editFile(
  client: Anthropic,
  target: Target,
  recs: WeeklyRecommendation[],
): Promise<boolean> {
  const relevant = recs.filter((r) => r.area === target.area);
  if (relevant.length === 0) {
    console.log(`No "${target.area}" recommendations — leaving ${target.file} unchanged.`);
    return false;
  }

  const original = await readFile(target.file, "utf8");
  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `File: ${target.file}
What it does: ${target.description}

Recommendations to apply (only the ones that fit this file):
${JSON.stringify(relevant, null, 2)}

Current file contents:
\`\`\`
${original}
\`\`\``,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const updated = stripFences(text);

  if (updated.length < original.length * 0.5) {
    console.warn(
      `Result for ${target.file} looks truncated (${updated.length} vs ${original.length} chars) — leaving unchanged.`,
    );
    return false;
  }
  if (updated === original.trim()) {
    console.log(`Model left ${target.file} unchanged.`);
    return false;
  }

  await writeFile(target.file, updated.endsWith("\n") ? updated : `${updated}\n`, "utf8");
  console.log(`Applied ${relevant.length} "${target.area}" rec(s) to ${target.file}.`);
  return true;
}

async function main() {
  const week = process.env.APPLY_WEEK || process.argv[2];
  const report = await getReport(week);
  if (!report) {
    console.error(`No weekly report found${week ? ` for ${week}` : ""}.`);
    process.exit(1);
  }

  const client = new Anthropic();
  let changed = 0;
  for (const target of TARGETS) {
    if (await editFile(client, target, report.recommendations)) changed += 1;
  }

  console.log(`Done. ${changed} file(s) changed for report ${report.week}.`);
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `changed=${changed}\nweek=${report.week}\n`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
