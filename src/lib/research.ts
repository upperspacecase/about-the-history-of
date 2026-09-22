import Anthropic from "@anthropic-ai/sdk";
import { CHECK_MODEL, VERIFY_EFFORT } from "./research-prompt";

/**
 * Historical verification. The analysis stage proposes history from model
 * knowledge; this stage treats those recalled facts as candidates and uses
 * web search to check the dates, the events and the central comparison. It
 * returns a verdict per claim. Every cited URL is code-verified against the
 * search results actually received, so a link from model memory can never
 * be presented as a check.
 */

// Each search iteration re-bills the whole context so far, so the cap is the
// main cost lever of this stage.
const MAX_SEARCHES = 4;
const MAX_PAUSE_RESUMES = 2;

const client = new Anthropic();

const VERIFY_PROMPT = `You are the fact-checking stage of The Long View, a daily news briefing. You receive the historical claims an analyst proposed for one story: a dated timeline and one central historical comparison (the precedent). The analyst wrote them from memory. Your job is to check them against the web.

You have a budget of exactly ${MAX_SEARCHES} web searches for all the claims together, so plan before you search: one search for the central comparison, then searches that each cover several related timeline entries (an article on an event usually confirms its date, its outcome and the entries around it). Once the budget is spent the tool refuses further calls; that is expected, not a failure. Every result you received earlier in this conversation stays valid evidence: write your verdicts from what you already have, and mark as unverified only the claims none of your results speak to.

Read the supporting passages you find and look actively for contradictions: a wrong year, a misattributed decision, a comparison that does not hold on the facts. Let the evidence change your view; do not confirm from memory.

Return your verdicts as plain text in this format:

VERDICTS:
<claim id>: confirmed | <S-id> | <one sentence on what the source shows>
<claim id>: contradicted | <S-id> | <what the source shows instead, specifically>
<claim id>: unverified | - | <what you searched for and why it stayed open>

SOURCES:
S1: <exact URL of a search result you received> | <title> | <publisher or site>
S2: ...

Rules:
- Use only the claim ids you were given. Give every claim a line.
- A confirmed or contradicted verdict must cite an S-id whose URL appeared in your search results in this conversation. If you cannot cite one, the verdict is unverified.
- Prefer primary or reference sources (official records, encyclopedias, major outlets' archives).
- Be specific in contradictions: the corrected date, name or fact, so the analyst can fix the claim individually.
- Do not rewrite the story and do not add new claims.`;

export interface ResearchSource {
  id: string;
  url: string;
  title: string;
  publisher: string;
}

export type ClaimVerdict = {
  /** T1..Tn timeline entries, P the precedent. */
  id: string;
  verdict: "confirmed" | "contradicted" | "unverified";
  note: string;
  sourceUrl?: string;
};

export interface HistoryVerification {
  verdicts: ClaimVerdict[];
  /** Only URLs actually received from search. */
  sources: ResearchSource[];
  /** The verdict lines as text, for the revision and critic stages. */
  summary: string;
}

/**
 * What gets checked: dates, events and the central comparison. Patterns are
 * interpretation, not fact, and are left to the critic.
 */
export interface HistoricalClaims {
  timeline: { year: string; title: string; description: string }[];
  precedent: {
    name: string;
    similarity: string;
    crucialDifference: string;
  } | null;
}

export function claimsToPrompt(claims: HistoricalClaims): string {
  const lines: string[] = ["CLAIMS TO CHECK:"];
  if (claims.precedent) {
    lines.push(
      `P (central comparison): ${claims.precedent.name}. Similarity: ${claims.precedent.similarity} Crucial difference: ${claims.precedent.crucialDifference}`
    );
  }
  claims.timeline.forEach((t, i) => {
    lines.push(`T${i + 1}: ${t.year}: ${t.title}. ${t.description}`);
  });
  return lines.join("\n");
}

function collectSearchUrls(
  content: Anthropic.ContentBlock[],
  into: Set<string>
): { searches: number; results: number; errors: string[] } {
  let searches = 0;
  let results = 0;
  const errors: string[] = [];
  for (const block of content) {
    if (block.type !== "web_search_tool_result") continue;
    searches++;
    if (Array.isArray(block.content)) {
      for (const result of block.content) {
        if (result.type === "web_search_result" && result.url) {
          into.add(result.url);
          results++;
        }
      }
    } else {
      errors.push(block.content.error_code);
    }
  }
  return { searches, results, errors };
}

function finalText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

function parseSources(text: string): ResearchSource[] {
  const out: ResearchSource[] = [];
  const sourceSection = text.split(/^SOURCES:\s*$/m)[1];
  if (!sourceSection) return out;
  const re = /^(S\d+):\s*(\S+)\s*\|\s*([^|]+?)\s*(?:\|\s*(.+?))?\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sourceSection)) !== null) {
    out.push({ id: m[1], url: m[2], title: m[3] ?? "", publisher: m[4] ?? "" });
  }
  return out;
}

function parseVerdicts(
  text: string,
  claimIds: string[],
  verifiedSources: Map<string, ResearchSource>
): ClaimVerdict[] {
  const section = text.split(/^VERDICTS:\s*$/m)[1]?.split(/^SOURCES:\s*$/m)[0] ?? "";
  const re = /^([TP]\d*):\s*(confirmed|contradicted|unverified)\s*\|\s*(\S+)\s*\|\s*(.+?)\s*$/gm;
  const found = new Map<string, ClaimVerdict>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(section)) !== null) {
    const [, id, verdict, sid, note] = m;
    const source = verifiedSources.get(sid);
    // A check that cannot cite a received URL is not a check.
    if (verdict !== "unverified" && !source) {
      found.set(id, { id, verdict: "unverified", note: `cited ${sid}, not a received search result` });
      continue;
    }
    found.set(id, {
      id,
      verdict: verdict as ClaimVerdict["verdict"],
      note,
      sourceUrl: source?.url,
    });
  }
  return claimIds.map(
    (id) => found.get(id) ?? { id, verdict: "unverified", note: "no verdict returned" }
  );
}

export async function verifyHistory(
  claims: HistoricalClaims
): Promise<HistoryVerification> {
  const claimIds = [
    ...(claims.precedent ? ["P"] : []),
    ...claims.timeline.map((_, i) => `T${i + 1}`),
  ];
  if (claimIds.length === 0) {
    return { verdicts: [], sources: [], summary: "" };
  }

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `${claimsToPrompt(claims)}\n\nCheck these claims now.` },
  ];
  const receivedUrls = new Set<string>();

  for (let i = 0; i <= MAX_PAUSE_RESUMES; i++) {
    const response = await client.messages.create({
      model: CHECK_MODEL,
      max_tokens: 16000,
      output_config: { effort: VERIFY_EFFORT },
      system: [
        { type: "text", text: VERIFY_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: MAX_SEARCHES,
        },
      ],
      messages,
    });

    const tally = collectSearchUrls(response.content, receivedUrls);
    console.log(
      `Verify: ${tally.searches} search(es), ${tally.results} result(s)` +
        (tally.errors.length > 0 ? `, errors: ${tally.errors.join(", ")}` : "") +
        `, stop ${response.stop_reason}`
    );

    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    if (response.stop_reason === "refusal") {
      break;
    }

    const text = finalText(response.content);
    const listed = parseSources(text);
    const verified = listed.filter((s) => receivedUrls.has(s.url));
    const verdicts = parseVerdicts(
      text,
      claimIds,
      new Map(verified.map((s) => [s.id, s]))
    );
    return {
      verdicts,
      sources: verified,
      summary: verdicts
        .map((v) => `${v.id}: ${v.verdict}${v.sourceUrl ? ` (${v.sourceUrl})` : ""}: ${v.note}`)
        .join("\n"),
    };
  }

  return {
    verdicts: claimIds.map((id) => ({ id, verdict: "unverified", note: "verification did not complete" })),
    sources: [],
    summary: "",
  };
}
