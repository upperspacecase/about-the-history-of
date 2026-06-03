import { getAdminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const token = url.searchParams.get("token");
  if (!id || !token) {
    return new Response("Invalid unsubscribe link.", { status: 400 });
  }

  const ref = getAdminDb().collection("subscribers").doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.unsubToken !== token) {
    return new Response("Invalid unsubscribe link.", { status: 400 });
  }

  await ref.set({ unsubscribed: true }, { merge: true });
  return new Response(
    "You've been unsubscribed from The Long View. You won't receive any more daily emails.",
    { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } }
  );
}
