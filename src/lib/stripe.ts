import Stripe from "stripe";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  cached = new Stripe(key);
  return cached;
}

export type Plan = "monthly" | "yearly" | "briefing";

export function getPriceId(plan: Plan): string {
  const id =
    plan === "yearly"
      ? process.env.STRIPE_PRICE_YEARLY
      : plan === "briefing"
        ? process.env.STRIPE_PRICE_BRIEFING
        : process.env.STRIPE_PRICE_MONTHLY;
  if (!id) {
    throw new Error(
      `Missing price ID env var for plan "${plan}": set STRIPE_PRICE_${plan.toUpperCase()}`
    );
  }
  return id;
}

// Stable Firestore doc id for a payer's email, so a pay-first subscription can
// be linked to the account they create afterward.
export function paidCustomerKey(email: string): string {
  return Buffer.from(email.toLowerCase()).toString("base64url");
}
