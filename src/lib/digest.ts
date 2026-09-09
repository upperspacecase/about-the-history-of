import { randomUUID } from "node:crypto";
import { getAdminDb } from "./firebase/admin";
import {
  sendDailyDigestEmail,
  type DigestEdition,
  type DigestStory,
} from "./resend";

const SITE = "https://thelongview.org";

export interface DigestResult {
  sent: number;
  failed: number;
  skipped: number;
}

/**
 * Send the daily briefing email to every active subscriber. Delivery is
 * idempotent per edition and subscriber (OPS 02): a ledger document keyed
 * `email:{editionId}:{subscriberId}` prevents duplicate delivery on retry,
 * and a provider error is recorded as failed, never as sent (AT 20).
 */
export async function sendDailyDigest(
  edition: DigestEdition,
  stories: DigestStory[]
): Promise<DigestResult> {
  const db = getAdminDb();
  const snap = await db.collection("subscribers").get();
  const active = snap.docs.filter((d) => d.data().unsubscribed !== true);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const doc of active) {
    const data = doc.data();
    const email = data.email as string | undefined;
    if (!email) continue;

    const ledgerId = `email:${edition.id}:${doc.id}`;
    const ledgerRef = db.collection("deliveries").doc(ledgerId);
    const existing = await ledgerRef.get();
    if (existing.exists && existing.data()?.status === "sent") {
      skipped++;
      continue;
    }

    let token = data.unsubToken as string | undefined;
    if (!token) {
      token = randomUUID();
      await doc.ref.set({ unsubToken: token }, { merge: true });
    }
    const unsubscribeUrl = `${SITE}/api/unsubscribe?id=${doc.id}&token=${encodeURIComponent(token)}`;

    const attempts = ((existing.data()?.attempts as number) ?? 0) + 1;
    try {
      const receipt = await sendDailyDigestEmail({
        to: email,
        edition,
        stories,
        unsubscribeUrl,
      });
      await ledgerRef.set({
        id: ledgerId,
        editionId: edition.id,
        channel: "email",
        status: "sent",
        attempts,
        providerReceipt: receipt ?? "",
        updatedAt: new Date().toISOString(),
      });
      sent++;
    } catch (err) {
      console.error(`digest send failed for subscriber ${doc.id}:`, err);
      await ledgerRef.set({
        id: ledgerId,
        editionId: edition.id,
        channel: "email",
        status: "failed",
        attempts,
        updatedAt: new Date().toISOString(),
      });
      failed++;
    }
  }
  return { sent, failed, skipped };
}
