import { buildEvidencePackage } from "./evidence";
import {
  generateStory,
  type StoryDoc,
  type StoryResult,
} from "./story-generate";
import type { Headline } from "./feeds";

/**
 * Interactive generation for a single reader-selected headline. This wraps
 * the same verdict-first pipeline the daily briefing uses, but with a
 * single-source evidence package. Confidence is calculated from the same
 * observable inputs, so single-source stories surface with the uncertainty
 * they deserve; the page must display it prominently.
 */

export type HistoryDoc = StoryDoc;

export class StoryWithheldError extends Error {
  reasons: string[];
  constructor(reasons: string[]) {
    super(`Analysis withheld: ${reasons.join("; ")}`);
    this.name = "StoryWithheldError";
    this.reasons = reasons;
  }
}

export async function generateHistory(
  headline: string,
  options: {
    source?: string;
    link?: string;
    category?: string;
    recentHeadlines?: string[];
  } = {}
): Promise<HistoryDoc> {
  const member: Headline = {
    title: headline,
    link: options.link ?? "",
    source: options.source ?? "Reader submitted",
    category: options.category ?? "World",
    pubDate: new Date().toISOString(),
    snippet: "",
  };

  const result = buildEvidencePackage([member]);
  const evidence = result.ok
    ? result.evidence
    : {
        // Interactive requests may rest on a single source. Build the
        // package anyway; the confidence calculation penalises it and the
        // interface shows the uncertainty prominently.
        sourceHeadline: member.title,
        sourcePublisher: member.source,
        sourceUrl: member.link,
        category: member.category,
        sources: [
          {
            publisher: member.source,
            title: member.title,
            url: member.link,
            publishedAt: member.pubDate,
          },
        ],
        passages: [],
        independentPublisherCount: 1,
        coverageVolume: 1,
        rapidlyDeveloping: false,
      };

  const story: StoryResult = await generateStory({
    evidence,
    recentHeadlines: options.recentHeadlines ?? [],
    allowLowConfidence: true,
  });

  if (story.status === "withheld") {
    throw new StoryWithheldError(story.reasons);
  }
  return story.doc;
}
