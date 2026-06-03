import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendSubscribeConfirmation } from "@/lib/resend";

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: unknown;
    source?: unknown;
  };
  const email = normalizeEmail(body.email);
  if (!email) {
    return Response.json({ error: "A valid email is required" }, { status: 400 });
  }
  const source =
    typeof body.source === "string" ? body.source.slice(0, 40) : "preview";
  const isWaitlist = source === "briefing-waitlist";

  const db = getAdminDb();
  const id = Buffer.from(email).toString("base64url");
  const ref = db.collection("subscribers").doc(id);

  const existing = await ref.get();
  if (!existing.exists) {
    await ref.set({
      email,
      source,
      unsubscribed: false,
      unsubToken: randomUUID(),
      createdAt: FieldValue.serverTimestamp(),
      ...(isWaitlist ? { briefingWaitlist: true } : {}),
    });
    await sendSubscribeConfirmation({ to: email });
  } else if (isWaitlist && existing.data()?.briefingWaitlist !== true) {
    await ref.set({ briefingWaitlist: true }, { merge: true });
  }

  return Response.json({ ok: true });
}
