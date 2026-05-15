import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

const TOTAL_FREE_YEARS = 250;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { inviterEmail?: unknown }
    | null;
  const raw = typeof body?.inviterEmail === "string" ? body.inviterEmail : "";
  const inviterEmail = raw.trim().toLowerCase();
  if (!inviterEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviterEmail)) {
    return Response.json({ error: "Enter a valid email" }, { status: 400 });
  }

  const db = getAdminDb();

  const inviterQuery = await db
    .collection("users")
    .where("email", "==", inviterEmail)
    .limit(1)
    .get();

  if (inviterQuery.empty) {
    return Response.json(
      { error: "No member found with that email" },
      { status: 404 }
    );
  }

  const inviterUid = inviterQuery.docs[0].id;
  if (inviterUid === uid) {
    return Response.json(
      { error: "You can't invite yourself" },
      { status: 400 }
    );
  }

  const userRef = db.collection("users").doc(uid);
  const counterRef = db.collection("meta").doc("founders");

  const result = await db.runTransaction(async (tx) => {
    const [userSnap, counterSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(counterRef),
    ]);
    const userData = userSnap.data();

    if (userData?.isPaying === true) {
      return { ok: false as const, reason: "You're already subscribed" };
    }
    if (userData?.invitedBy) {
      return {
        ok: false as const,
        reason: "You've already claimed a free year",
      };
    }

    const claimed = (counterSnap.data()?.claimed as number) ?? 0;
    if (claimed >= TOTAL_FREE_YEARS) {
      return { ok: false as const, reason: "All free year slots are claimed" };
    }

    const expiresAt = Timestamp.fromMillis(Date.now() + ONE_YEAR_MS);
    tx.set(
      userRef,
      {
        invitedBy: inviterUid,
        invitedAt: FieldValue.serverTimestamp(),
        freeYearExpiresAt: expiresAt,
      },
      { merge: true }
    );
    tx.set(
      counterRef,
      { claimed: FieldValue.increment(1) },
      { merge: true }
    );

    return {
      ok: true as const,
      remaining: TOTAL_FREE_YEARS - claimed - 1,
      expiresAt: expiresAt.toMillis(),
    };
  });

  if (!result.ok) {
    return Response.json({ error: result.reason }, { status: 400 });
  }

  return Response.json({
    ok: true,
    remaining: result.remaining,
    freeYearExpiresAt: result.expiresAt,
  });
}
