import { fetchAllHeadlines, type Headline } from "@/lib/feeds";

interface StoryCluster {
  members: Headline[];
  sources: Set<string>;
  signature: string;
}

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "for",
  "with", "at", "by", "from", "as", "is", "are", "was", "were", "be",
  "has", "have", "had", "it", "its", "this", "that", "these", "those",
  "after", "over", "into", "amid", "says", "say", "new",
]);

function significantWords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w));
}

function signature(words: string[]): string {
  return words.slice(0, 6).join(" ");
}

function overlapScore(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const w of a) {
    if (b.has(w)) shared += 1;
  }
  return shared / Math.min(a.size, b.size);
}

export async function selectTopStories(limit = 10): Promise<Headline[]> {
  const headlines = await fetchAllHeadlines();

  const clusters: StoryCluster[] = [];
  const wordSets: Set<string>[] = [];

  for (const headline of headlines) {
    const words = significantWords(headline.title);
    const sig = signature(words);
    const wordSet = new Set(words);

    let matched: StoryCluster | undefined;
    for (let i = 0; i < clusters.length; i++) {
      if (
        clusters[i].signature === sig ||
        overlapScore(wordSets[i], wordSet) >= 0.6
      ) {
        matched = clusters[i];
        break;
      }
    }

    if (matched) {
      matched.members.push(headline);
      matched.sources.add(headline.source);
    } else {
      clusters.push({
        members: [headline],
        sources: new Set([headline.source]),
        signature: sig,
      });
      wordSets.push(wordSet);
    }
  }

  clusters.sort((a, b) => {
    if (a.sources.size !== b.sources.size) {
      return b.sources.size - a.sources.size;
    }
    return mostRecentTime(b) - mostRecentTime(a);
  });

  return clusters.slice(0, limit).map(representative);
}

function mostRecentTime(cluster: StoryCluster): number {
  return Math.max(
    ...cluster.members.map((m) => new Date(m.pubDate).getTime() || 0)
  );
}

function representative(cluster: StoryCluster): Headline {
  const withImage = cluster.members.filter((m) => m.image);
  const pool = withImage.length > 0 ? withImage : cluster.members;
  return pool.reduce((best, current) =>
    new Date(current.pubDate).getTime() > new Date(best.pubDate).getTime()
      ? current
      : best
  );
}
