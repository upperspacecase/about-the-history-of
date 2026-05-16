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

export function getPriceId(plan: "monthly" | "yearly"): string {
  const id =
    plan === "yearly"
      ? process.env.STRIPE_PRICE_YEARLY
      : process.env.STRIPE_PRICE_MONTHLY;
  if (!id) {
    throw new Error(
      `Missing price ID env var for plan "${plan}": set STRIPE_PRICE_${plan.toUpperCase()}`
    );
  }
  return id;
}
