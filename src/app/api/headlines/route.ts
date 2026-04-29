import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
});

interface FeedSource {
  name: string;
  url: string;
  category: string;
}

const FEEDS: FeedSource[] = [
  {
    name: "BBC News",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    category: "World",
  },
  {
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    category: "World",
  },
  {
    name: "Associated Press",
    url: "https://rsshub.app/apnews/topics/apf-topnews",
    category: "World",
  },
  {
    name: "NPR",
    url: "https://feeds.npr.org/1001/rss.xml",
    category: "U.S.",
  },
  {
    name: "BBC News",
    url: "https://feeds.bbci.co.uk/news/politics/rss.xml",
    category: "Politics",
  },
  {
    name: "BBC News",
    url: "https://feeds.bbci.co.uk/news/business/rss.xml",
    category: "Business",
  },
  {
    name: "BBC News",
    url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    category: "Science",
  },
  {
    name: "BBC News",
    url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    category: "Technology",
  },
];


export interface Headline {
  title: string;
  link: string;
  source: string;
  category: string;
  pubDate: string;
  snippet: string;
}

async function fetchFeed(feed: FeedSource): Promise<Headline[]> {
  try {
    const parsed = await parser.parseURL(feed.url);
    return (parsed.items || []).slice(0, 8).map((item) => ({
      title: (item.title || "").trim(),
      link: item.link || "",
      source: feed.name,
      category: feed.category,
      pubDate: item.pubDate || item.isoDate || "",
      snippet: (item.contentSnippet || item.content || "")
        .replace(/<[^>]*>/g, "")
        .slice(0, 200)
        .trim(),
    }));
  } catch (err) {
    console.error(`Failed to fetch ${feed.name}:`, err);
    return [];
  }
}

export async function GET() {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const headlines: Headline[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      headlines.push(...result.value);
    }
  }

  // Deduplicate by title similarity and sort by date
  const seen = new Set<string>();
  const unique = headlines.filter((h) => {
    if (!h.title) return false;
    const key = h.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );

  return Response.json({ headlines: unique.slice(0, 30) });
}
