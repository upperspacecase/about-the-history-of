import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { getPriceId, getStripe, type Plan } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  // Auth is optional. Subscribing does not require an account — you pay first
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

  const body = (await request.json().catch(() => null)) as
    | { plan?: unknown }
    | null;
  const plan: Plan =
    body?.plan === "monthly"
      ? "monthly"
      : body?.plan === "briefing"
        ? "briefing"
        : "yearly";

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
