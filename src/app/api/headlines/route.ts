import Parser from "rss-parser";

interface FeedItemExtras {
  mediaThumbnail?: unknown;
  mediaContent?: unknown;
}

const parser: Parser<unknown, FeedItemExtras> = new Parser({
  timeout: 10000,
  customFields: {
    item: [
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      ["media:content", "mediaContent", { keepArray: true }],
    ],
  },
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
  image?: string;
}

function extractImage(item: Parser.Item & FeedItemExtras): string | undefined {
  // <media:thumbnail url="..." />
  const thumb = item.mediaThumbnail;
  if (Array.isArray(thumb) && thumb.length > 0) {
    const url = (thumb[0] as { $?: { url?: string } })?.$?.url;
    if (url) return upgradeBbcImage(url);
  }
  // <media:content url="..." />
  const content = item.mediaContent;
  if (Array.isArray(content) && content.length > 0) {
    const url = (content[0] as { $?: { url?: string } })?.$?.url;
    if (url) return upgradeBbcImage(url);
  }
  // <enclosure url="..." type="image/..." />
  const enclosure = item.enclosure;
  if (enclosure?.url && enclosure.type?.startsWith("image/")) {
    return enclosure.url;
  }
  return undefined;
}

function upgradeBbcImage(url: string): string {
  // BBC ichef URLs look like: https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/...
  // Larger preset (976) is available and renders cleanly in the lead card.
  return url.replace(
    /(ichef\.bbci\.co\.uk\/[a-z]+\/[a-z]+\/)\d+\//,
    "$1976/"
  );
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
      image: extractImage(item),
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
