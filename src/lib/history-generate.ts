import Anthropic from "@anthropic-ai/sdk";
import type { HistoryResponse } from "@/lib/history-types";
import { RESEARCH_PROMPT } from "@/lib/research-prompt";

export interface HistoryDoc
  extends Required<
    Pick<
      HistoryResponse,
      "truthHeadline" | "significance" | "significanceReason"
    >
  >,
    Omit<
      HistoryResponse,
      "truthHeadline" | "significance" | "significanceReason"
    > {
  headline: string;
}

const client = new Anthropic();

export async function generateHistory(headline: string): Promise<HistoryDoc> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system: RESEARCH_PROMPT,
    messages: [{ role: "user", content: `News headline: "${headline}"` }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const parsed = JSON.parse(cleaned) as Omit<HistoryDoc, "headline">;

  const significance = Math.min(
    10,
    Math.max(1, Math.round(Number(parsed.significance) || 5))
  );

  return {
    ...parsed,
    headline,
    significance,
    significanceReason:
      typeof parsed.significanceReason === "string"
        ? parsed.significanceReason
        : "",
    truthHeadline:
      typeof parsed.truthHeadline === "string" ? parsed.truthHeadline : "",
  };
}
