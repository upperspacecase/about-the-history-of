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
  const counterRef = db.collection("meta").doc("founders");

  const created = await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(ref);
    if (userSnap.exists) return false;

    tx.set(ref, {
      isPaying: false,
      email: email ?? null,
      name: name ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(
      counterRef,
      { claimed: FieldValue.increment(1) },
      { merge: true }
    );
    return true;
  });

  if (!created) return Response.json({ created: false });

  if (email) {
    try {
      await sendWelcomeEmail({ to: email, name });
    } catch (err) {
      console.error("Welcome email failed:", err);
    }
  }

  return Response.json({ created: true });
}
