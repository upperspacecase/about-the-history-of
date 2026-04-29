import Anthropic from "@anthropic-ai/sdk";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { headlineKey } from "@/lib/history-key";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a historian and analyst. Given a news headline, provide a structured historical analysis of the underlying topic.

Your response must be valid JSON with this exact structure:
{
  "topic": "The core historical topic extracted from the headline (e.g. 'U.S. Federal Reserve Interest Rate Policy')",
  "summary": "A 2-3 sentence overview connecting the headline to its deeper historical roots. Write in a clear, authoritative editorial voice.",
  "timeline": [
    {
      "year": "Year or date range (e.g. '1944', '1960s', '1971-1973')",
      "title": "Short event title",
      "description": "1-2 sentence description of this event and its significance",
      "link": "A Wikipedia URL for further reading on this specific event (use the most specific article available)"
    }
  ],
  "patterns": [
    {
      "title": "Short pattern name (e.g. 'Boom-Bust Cycles')",
      "description": "1-2 sentences explaining this recurring pattern and how it connects to the headline"
    }
  ],
  "furtherReading": [
    {
      "title": "Title of a well-known book, documentary, or long-form article on this topic",
      "author": "Author name",
      "type": "book | documentary | article",
      "link": "A Wikipedia URL for the book/documentary, or a well-known publication URL for articles"
    }
  ],
  "whyItMattersNow": "2-3 sentences explaining why the historical context makes today's headline more meaningful. What pattern is repeating? What precedent should we be watching?"
}

Guidelines:
- Include 6-10 timeline events, ordered chronologically
- Include 3-4 recurring patterns
- Include 3-5 further reading recommendations
- Be specific with dates, names, and facts
- For links, use Wikipedia URLs (https://en.wikipedia.org/wiki/Article_Name) — they are stable and accessible
- Focus on the most significant and illuminating historical events
- Write clearly for a general audience in an editorial news voice
- Return ONLY the JSON object, no other text`;

interface HistoryDoc {
  headline: string;
  topic: string;
  summary: string;
  timeline: unknown[];
  patterns: unknown[];
  furtherReading: unknown[];
  whyItMattersNow: string;
}

function validateHeadline(headline: unknown): string | { error: string; status: number } {
  if (!headline || typeof headline !== "string") {
    return { error: "A headline is required", status: 400 };
  }
  if (headline.length > 500) {
    return { error: "Headline is too long (max 500 characters)", status: 400 };
  }
  return headline;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const headline = url.searchParams.get("headline");
  const result = validateHeadline(headline);
  if (typeof result !== "string") {
    return Response.json({ error: result.error }, { status: result.status });
  }

  const id = headlineKey(result);
  const snap = await getAdminDb().collection("histories").doc(id).get();
  if (!snap.exists) {
    return Response.json({ cached: false }, { status: 404 });
  }
  const data = snap.data() as HistoryDoc;
  return Response.json({ cached: true, ...data });
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return Response.json(
        { error: "Sign in required to generate a new history" },
        { status: 401 }
      );
    }

    let uid: string;
    try {
      const decoded = await getAdminAuth().verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return Response.json({ error: "Invalid auth token" }, { status: 401 });
    }

    const { headline } = await request.json();
    const result = validateHeadline(headline);
    if (typeof result !== "string") {
      return Response.json({ error: result.error }, { status: result.status });
    }

    const id = headlineKey(result);
    const db = getAdminDb();
    const ref = db.collection("histories").doc(id);
    const userRef = db.collection("users").doc(uid);

    const existing = await ref.get();
    if (existing.exists) {
      return Response.json({ cached: true, ...(existing.data() as HistoryDoc) });
    }

    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      await userRef.set({
        isPaying: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `News headline: "${result}"` }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    const parsed = JSON.parse(cleaned) as Omit<HistoryDoc, "headline">;

    const doc: HistoryDoc = { headline: result, ...parsed };
    await ref.set({
      ...doc,
      generatedBy: uid,
      generatedAt: FieldValue.serverTimestamp(),
    });

    return Response.json({ cached: false, ...doc });
  } catch (err) {
    console.error("History API error:", err);
    const detail = err instanceof Error ? err.message : String(err);
    if (err instanceof SyntaxError) {
      return Response.json(
        { error: "Failed to parse historical analysis", detail },
        { status: 500 }
      );
    }
    return Response.json(
      { error: "Failed to generate historical analysis", detail },
      { status: 500 }
    );
  }
}
