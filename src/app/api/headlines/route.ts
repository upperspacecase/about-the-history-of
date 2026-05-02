import Parser from "rss-parser";
import { getAdminDb } from "@/lib/firebase/admin";
import { headlineKey } from "@/lib/history-key";

export const revalidate = 600;

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
  // World
  { name: "BBC News", url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "World" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", category: "World" },
  { name: "New York Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", category: "World" },
  { name: "CNN", url: "http://rss.cnn.com/rss/edition.rss", category: "World" },
  { name: "Washington Post", url: "https://feeds.washingtonpost.com/rss/world", category: "World" },
  { name: "Wall Street Journal", url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml", category: "World" },

  // U.S.
  { name: "NPR", url: "https://feeds.npr.org/1001/rss.xml", category: "U.S." },

  // Politics
  { name: "BBC News", url: "https://feeds.bbci.co.uk/news/politics/rss.xml", category: "Politics" },
  { name: "New York Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml", category: "Politics" },
  { name: "CNN", url: "http://rss.cnn.com/rss/cnn_allpolitics.rss", category: "Politics" },
  { name: "Washington Post", url: "https://feeds.washingtonpost.com/rss/politics", category: "Politics" },

  // Business
  { name: "BBC News", url: "https://feeds.bbci.co.uk/news/business/rss.xml", category: "Business" },
  { name: "New York Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml", category: "Business" },
  { name: "CNN", url: "http://rss.cnn.com/rss/money_news_international.rss", category: "Business" },
  { name: "Washington Post", url: "https://feeds.washingtonpost.com/rss/business", category: "Business" },
  { name: "Wall Street Journal", url: "https://feeds.a.dj.com/rss/RSSWSJD.xml", category: "Business" },

  // Science
  { name: "BBC News", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", category: "Science" },
  { name: "New York Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/Science.xml", category: "Science" },

  // Technology
  { name: "BBC News", url: "https://feeds.bbci.co.uk/news/technology/rss.xml", category: "Technology" },
  { name: "New York Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml", category: "Technology" },
  { name: "CNN", url: "http://rss.cnn.com/rss/edition_technology.rss", category: "Technology" },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "Technology" },
];


export interface Headline {
  title: string;
  link: string;
  source: string;
  category: string;
  pubDate: string;
  snippet: string;
  image?: string;
  truthHeadline?: string;
  hasHistory?: boolean;
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
    return (parsed.items || []).slice(0, 5).map((item) => ({
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

  const top = unique.slice(0, 60);
  const enriched = await attachHistory(top);

  enriched.sort((a, b) => {
    const aHas = a.hasHistory ? 1 : 0;
    const bHas = b.hasHistory ? 1 : 0;
    if (aHas !== bHas) return bHas - aHas;
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });

  return Response.json({ headlines: enriched });
}

async function attachHistory(headlines: Headline[]): Promise<Headline[]> {
  if (headlines.length === 0) return headlines;
  try {
    const db = getAdminDb();
    const refs = headlines.map((h) =>
      db.collection("histories").doc(headlineKey(h.title))
    );
    const snaps = await db.getAll(...refs);
    return headlines.map((h, i) => {
      const snap = snaps[i];
      if (!snap.exists) return h;
      const data = snap.data() as { truthHeadline?: string } | undefined;
      return {
        ...h,
        hasHistory: true,
        truthHeadline:
          typeof data?.truthHeadline === "string" && data.truthHeadline.trim()
            ? data.truthHeadline
            : undefined,
      };
    });
  } catch (err) {
    console.error("Failed to attach history metadata:", err);
    return headlines;
  }
}
