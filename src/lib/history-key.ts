import { createHash } from "crypto";

export function headlineKey(headline: string): string {
  const normalized = headline.trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}
