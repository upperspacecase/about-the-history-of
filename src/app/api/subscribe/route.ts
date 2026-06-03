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
  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail((body as { email?: unknown }).email);
  if (!email) {
    return Response.json({ error: "A valid email is required" }, { status: 400 });
  }

  const db = getAdminDb();
  const id = Buffer.from(email).toString("base64url");
  const ref = db.collection("subscribers").doc(id);

  const existing = await ref.get();
  if (!existing.exists) {
    await ref.set({
      email,
      source: "preview",
      unsubscribed: false,
      unsubToken: randomUUID(),
      createdAt: FieldValue.serverTimestamp(),
    });
    await sendSubscribeConfirmation({ to: email });
  }

  return Response.json({ ok: true });
}
