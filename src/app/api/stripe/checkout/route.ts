import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { getPriceId, getStripe, TRIAL_DAYS, type Plan } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  // Auth is optional. Subscribing does not require an account: you pay first
  // and create the account afterward (it links by email). If a signed-in token
  // is present we link the subscription to that account directly.
  let uid: string | undefined;
  let email: string | undefined;
  if (token) {
    try {
      const decoded = await getAdminAuth().verifyIdToken(token);
      uid = decoded.uid;
      email = decoded.email;
    } catch {
      // Fall through as a signed-out checkout.
    }
  }

  // One plan: The Daily Long View, $99/yr with a 14-day free trial. The
  // request body is read for forward compatibility but cannot select tiers.
  await request.json().catch(() => null);
  const plan: Plan = "annual";

  const origin =
    request.headers.get("origin") ??
    `https://${request.headers.get("host") ?? "thelongview.org"}`;

  let existingCustomerId: string | undefined;
  if (uid) {
    const userSnap = await getAdminDb().collection("users").doc(uid).get();
    existingCustomerId = userSnap.data()?.stripeCustomerId as string | undefined;
  }

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: getPriceId(plan), quantity: 1 }],
    success_url: `${origin}/?paid=1`,
    cancel_url: `${origin}/?paid=0`,
    customer: existingCustomerId,
    customer_email: existingCustomerId ? undefined : email,
    metadata: { plan, ...(uid ? { uid } : {}) },
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { plan, ...(uid ? { uid } : {}) },
    },
    ...(uid ? { client_reference_id: uid } : {}),
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
