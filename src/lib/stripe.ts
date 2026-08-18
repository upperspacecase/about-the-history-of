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

// One paid plan: The Daily Long View at $99 per year, with a 14-day free
// trial. No tiers while the product is entirely automated.
export type Plan = "annual";

export const TRIAL_DAYS = 14;

export function getPriceId(plan: Plan = "annual"): string {
  void plan;
  // STRIPE_PRICE_ANNUAL is the $99/yr price. STRIPE_PRICE_YEARLY is accepted
  // as a fallback so existing deployments keep working until the env var is
  // renamed.
  const id = process.env.STRIPE_PRICE_ANNUAL ?? process.env.STRIPE_PRICE_YEARLY;
  if (!id) {
    throw new Error(
      "Missing price ID env var: set STRIPE_PRICE_ANNUAL (the $99/yr price)"
    );
  }
  return id;
}

// Stable Firestore doc id for a payer's email, so a pay-first subscription can
// be linked to the account they create afterward.
export function paidCustomerKey(email: string): string {
  return Buffer.from(email.toLowerCase()).toString("base64url");
}
