import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  generateHistory,
  StoryWithheldError,
  type HistoryDoc,
} from "@/lib/history-generate";
import { headlineKey } from "@/lib/history-key";
import { fetchRecentPublishedHeadlines } from "@/lib/recent-headlines";

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

    const { headline, source, link } = await request.json();
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

    const recentHeadlines = await fetchRecentPublishedHeadlines(50);
    const doc = await generateHistory(result, {
      source: typeof source === "string" ? source : undefined,
      link: typeof link === "string" ? link : undefined,
      recentHeadlines,
    });
    await ref.set({
      ...doc,
      generatedBy: uid,
      generatedAt: FieldValue.serverTimestamp(),
    });

    return Response.json({ cached: false, ...doc });
  } catch (err) {
    console.error("History API error:", err);
    const detail = err instanceof Error ? err.message : String(err);
    if (err instanceof StoryWithheldError) {
      return Response.json(
        {
          error:
            "The evidence for this story did not pass our automated checks, so the analysis was withheld rather than published.",
          detail,
          withheld: true,
        },
        { status: 422 }
      );
    }
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
