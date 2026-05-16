import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { getPriceId, getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  let uid: string;
  let email: string | undefined;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email;
  } catch {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { plan?: unknown }
    | null;
  const plan = body?.plan === "monthly" ? "monthly" : "yearly";

  const origin =
    request.headers.get("origin") ??
    `https://${request.headers.get("host") ?? "thelongview.org"}`;

  const userRef = getAdminDb().collection("users").doc(uid);
  const userSnap = await userRef.get();
  const existingCustomerId = userSnap.data()?.stripeCustomerId as
    | string
    | undefined;

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: getPriceId(plan), quantity: 1 }],
    success_url: `${origin}/?paid=1`,
    cancel_url: `${origin}/?paid=0`,
    client_reference_id: uid,
    customer: existingCustomerId,
    customer_email: existingCustomerId ? undefined : email,
    metadata: { uid, plan },
    subscription_data: {
      metadata: { uid, plan },
    },
    allow_promotion_codes: true,
  });

  if (!session.url) {
    return Response.json(
      { error: "Stripe did not return a checkout URL" },
      { status: 500 }
    );
  }

  return Response.json({ url: session.url });
}
