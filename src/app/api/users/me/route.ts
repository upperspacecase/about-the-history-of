import type { Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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

  const snap = await getAdminDb().collection("users").doc(uid).get();
  const data = snap.data();
  const expires = data?.freeYearExpiresAt as Timestamp | undefined;
  const expiresMs = expires?.toMillis() ?? null;
  const freeYearActive = expiresMs !== null && expiresMs > Date.now();

  return Response.json({
    isPaying: data?.isPaying === true,
    freeYearActive,
    freeYearExpiresAt: expiresMs,
  });
}
