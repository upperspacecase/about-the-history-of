// Opt-in switches for a cheaper Daily Edition run.
// Every default matches the publisher as it behaved before these flags existed:
// three stories, Claude triage, subscriber email, and Meta reels.

export type TriageProvider = "claude" | "jev";

type FlagEnv = { [key: string]: string | undefined };

function flagOn(value: string | undefined): boolean {
  return value === "1" || value === "true";
}

/** Edition cap. Unset or invalid values stay at 3. Valid range is 1-3. */
export function maxStories(env: FlagEnv = process.env): number {
  const raw = env.MAX_STORIES?.trim();
  if (!raw) return 3;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 3) return 3;
  return n;
}

export function siteOnly(env: FlagEnv = process.env): boolean {
  return flagOn(env.SITE_ONLY) || env.CHANNELS?.trim() === "site";
}

/** Skip Remotion renders and Instagram/Facebook posting. */
export function skipReels(env: FlagEnv = process.env): boolean {
  return siteOnly(env) || flagOn(env.SKIP_REELS);
}

/** Skip the subscriber digest. The operator report is separate. */
export function skipSubscriberEmail(env: FlagEnv = process.env): boolean {
  return (
    siteOnly(env) ||
    flagOn(env.SKIP_SUBSCRIBER_EMAIL) ||
    flagOn(env.OPS_EMAIL_ONLY)
  );
}

/** `jev` only when the value is exactly that. Anything else, including unset, is Claude. */
export function triageProvider(env: FlagEnv = process.env): TriageProvider {
  return env.TRIAGE_PROVIDER?.trim().toLowerCase() === "jev" ? "jev" : "claude";
}

/**
 * Noul probability required before a cluster is sent to the Claude write-up.
 * Unset or out of range stays at 0.55.
 */
export function jevNoulThreshold(env: FlagEnv = process.env): number {
  const raw = env.JEV_NOUL_THRESHOLD?.trim();
  if (!raw) return 0.55;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) return 0.55;
  return n;
}
