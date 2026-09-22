import Anthropic from "@anthropic-ai/sdk";
import { evidenceToPrompt, type EvidencePackage } from "./evidence";
import { PIPELINE_MODEL } from "./research-prompt";

/**
 * Grounded historical research (EVD 06). Before analysis, an opus call with
 * the web_search server tool gathers the background and precedent material a
 * story may need, returning notes plus the sources it actually received.
 * Every URL is code-verified against the search results collected from the
 * response stream, so a link from model memory can never enter a story.
 */

const MODEL = PIPELINE_MODEL;
// Every search iteration re-bills the whole context so far, so this cap is
// the main cost lever of the pipeline. 4 replaced 8 on 2026-09-22.
const MAX_SEARCHES = 4;
const MAX_PAUSE_RESUMES = 6;

const client = new Anthropic();

const RESEARCH_PROMPT = `You are the research stage of The Long View, a daily news briefing. You receive an evidence package describing one current news development. Your job is to gather the HISTORICAL and BACKGROUND material that would help explain it: how the situation developed, dated prior events, the closest genuinely comparable precedent, and institutional background.

Use the web search tool. Only write down facts that a search result you received supports, and attach the source. If searching yields nothing useful for some angle, say so plainly rather than filling the gap from memory.

Return your findings as plain text notes in this format:

FINDINGS:
- <dated fact or background point> [S1]
- <another point> [S2]
...

PRECEDENT CANDIDATES:
- <named precedent with date range>: <similarity>; <concrete difference> [S3]

GAPS:
- <angles where search produced nothing reliable>

SOURCES:
S1: <exact URL of a search result you received> | <title> | <publisher or site>
S2: ...

Rules:
- Every finding cites at least one S-id. Every S-id URL must be a URL that appeared in your search results in this conversation.
- Prefer primary or reference sources (official records, encyclopedias, major outlets' archives).
- Keep notes factual and dated. No analysis, no scoring, no headline writing.
- If the evidence package is about a rapidly developing event, focus on background that will stay true.`;

export interface ResearchSource {
  id: string;
  url: string;
  title: string;
  publisher: string;
}

export interface ResearchNotes {
  notes: string; // FINDINGS/PRECEDENT/GAPS sections, with S-ids
  sources: ResearchSource[]; // only URLs actually received from search
  discardedSources: number; // S-ids that failed URL verification
}

function collectSearchUrls(
  content: Anthropic.ContentBlock[],
  into: Set<string>
) {
  for (const block of content) {
    if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const result of block.content) {
        if (result.type === "web_search_result" && result.url) {
          into.add(result.url);
        }
      }
    }
  }
}

function finalText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

function parseSources(text: string): { id: string; url: string; title: string; publisher: string }[] {
  const out: { id: string; url: string; title: string; publisher: string }[] = [];
  const sourceSection = text.split(/^SOURCES:\s*$/m)[1];
  if (!sourceSection) return out;
  const re = /^(S\d+):\s*(\S+)\s*\|\s*([^|]+?)\s*(?:\|\s*(.+?))?\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sourceSection)) !== null) {
    out.push({
      id: m[1],
      url: m[2],
      title: m[3] ?? "",
      publisher: m[4] ?? "",
    });
  }
  return out;
}

export async function researchBackground(
  evidence: EvidencePackage
): Promise<ResearchNotes> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `${evidenceToPrompt(evidence)}\n\nResearch the background now.`,
    },
  ];
  const receivedUrls = new Set<string>();

  for (let i = 0; i <= MAX_PAUSE_RESUMES; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: RESEARCH_PROMPT,
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: MAX_SEARCHES,
        },
      ],
      messages,
    });

    collectSearchUrls(response.content, receivedUrls);

    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    if (response.stop_reason === "refusal") {
      // Research is optional decoration for the story; fail soft with no
      // notes rather than blocking the current-event analysis.
      return { notes: "", sources: [], discardedSources: 0 };
    }

    const text = finalText(response.content);
    const listed = parseSources(text);
    const verified = listed.filter((s) => receivedUrls.has(s.url));
    const verifiedIds = new Set(verified.map((s) => s.id));

    // Strip findings whose only citations failed verification, so the
    // analysis stage never sees an unverifiable claim.
    const keptLines = text
      .split("\n")
      .filter((line) => {
        const ids = [...line.matchAll(/\[(S\d+)\]/g)].map((m) => m[1]);
        if (ids.length === 0) return true;
        return ids.some((id) => verifiedIds.has(id));
      })
      .join("\n");

    return {
      notes: keptLines,
      sources: verified,
      discardedSources: listed.length - verified.length,
    };
  }
  return { notes: "", sources: [], discardedSources: 0 };
}
