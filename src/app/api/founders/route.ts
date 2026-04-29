import { getAdminDb } from "@/lib/firebase/admin";

const TOTAL = 250;

export async function GET() {
  const snap = await getAdminDb().collection("meta").doc("founders").get();
  const claimed = (snap.data()?.claimed as number) ?? 0;
  const remaining = Math.max(0, TOTAL - claimed);
  return Response.json(
    { claimed, total: TOTAL, remaining },
    { headers: { "cache-control": "public, max-age=10" } }
  );
}
