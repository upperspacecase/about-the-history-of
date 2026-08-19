import { randomUUID } from "node:crypto";
import { getAdminDb } from "./firebase/admin";
import { sendDailyDigestEmail, type DigestStory } from "./resend";

const SITE = "https://thelongview.org";

/**
 * Send the daily briefing to every active subscriber. An empty story list is
 * legitimate: subscribers get a short quiet-day note, because "nothing much
 * changed" is itself a useful conclusion.
 * Lazily mints an unsubscribe token for subscribers that predate the field.
 */
export async function sendDailyDigest(
  stories: DigestStory[]
): Promise<{ sent: number; failed: number }> {

  const db = getAdminDb();
  const snap = await db.collection("subscribers").get();
  const active = snap.docs.filter((d) => d.data().unsubscribed !== true);

  let sent = 0;
  let failed = 0;
  for (const doc of active) {
    const data = doc.data();
    const email = data.email as string | undefined;
    if (!email) continue;

    let token = data.unsubToken as string | undefined;
    if (!token) {
      token = randomUUID();
      await doc.ref.set({ unsubToken: token }, { merge: true });
    }
    const unsubscribeUrl = `${SITE}/api/unsubscribe?id=${doc.id}&token=${encodeURIComponent(token)}`;

    try {
      await sendDailyDigestEmail({ to: email, stories, unsubscribeUrl });
      sent++;
    } catch (err) {
      console.error(`digest send failed for ${email}:`, err);
      failed++;
    }
  }
  return { sent, failed };
}
