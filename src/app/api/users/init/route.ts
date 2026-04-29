import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { sendWelcomeEmail } from "@/lib/resend";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  let uid: string;
  let email: string | undefined;
  let name: string | undefined;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email;
    name = decoded.name;
  } catch {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  const db = getAdminDb();
  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();

  if (snap.exists) {
    return Response.json({ created: false });
  }

  await ref.set({
    isPaying: false,
    email: email ?? null,
    name: name ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });

  if (email) {
    try {
      await sendWelcomeEmail({ to: email, name });
    } catch (err) {
      console.error("Welcome email failed:", err);
    }
  }

  return Response.json({ created: true });
}
