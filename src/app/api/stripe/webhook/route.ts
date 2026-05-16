import { FieldValue } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { getAdminDb } from "@/lib/firebase/admin";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const rawBody = await request.text();

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      secret
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("Stripe signature verification failed:", message);
    return new Response(`Webhook signature error: ${message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription") break;
        const uid =
          session.client_reference_id ??
          (session.metadata?.uid as string | undefined);
        if (!uid) {
          console.warn("checkout.session.completed without uid", session.id);
          break;
        }
        await getAdminDb()
          .collection("users")
          .doc(uid)
          .set(
            {
              isPaying: true,
              stripeCustomerId:
                typeof session.customer === "string"
                  ? session.customer
                  : session.customer?.id,
              stripeSubscriptionId:
                typeof session.subscription === "string"
                  ? session.subscription
                  : session.subscription?.id,
              stripeStatus: "active",
              subscribedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const uid = sub.metadata?.uid as string | undefined;
        if (!uid) {
          console.warn(
            `${event.type} without uid metadata; subscription`,
            sub.id
          );
          break;
        }
        const active =
          sub.status === "active" ||
          sub.status === "trialing" ||
          sub.status === "past_due";
        await getAdminDb()
          .collection("users")
          .doc(uid)
          .set(
            {
              isPaying: active,
              stripeStatus: sub.status,
              stripeSubscriptionId: sub.id,
            },
            { merge: true }
          );
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
