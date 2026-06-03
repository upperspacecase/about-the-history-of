import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { sendWelcomeEmail } from "@/lib/resend";
import { getStripe, paidCustomerKey } from "@/lib/stripe";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  let uid: string;
  let email: string | undefined;
  let name: string | undefined;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email;
    name = decoded.name;
  } catch {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  const db = getAdminDb();
  const ref = db.collection("users").doc(uid);
  const normalizedEmail = email ? email.toLowerCase() : null;

  const created = await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(ref);
    if (userSnap.exists) return false;

    tx.set(ref, {
      isPaying: false,
      email: normalizedEmail,
      name: name ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
    return true;
  });

  // Link a subscription that was paid for before this account existed. Only on
  // the first link (no stripeSubscriptionId yet) — after that the webhook owns
  // the paid status via the uid we stamp onto the subscription below.
  const userData = (await ref.get()).data();
  let isPaying = userData?.isPaying === true;

  if (!isPaying && !userData?.stripeSubscriptionId && normalizedEmail) {
    const paidSnap = await db
      .collection("paidCustomers")
      .doc(paidCustomerKey(normalizedEmail))
      .get();
    const paid = paidSnap.data();
    if (paid && paid.stripeStatus === "active") {
      await ref.set(
        {
          isPaying: true,
          plan: paid.plan ?? null,
          stripeCustomerId: paid.stripeCustomerId ?? null,
          stripeSubscriptionId: paid.stripeSubscriptionId ?? null,
          stripeStatus: "active",
          subscribedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      isPaying = true;

      // Stamp the uid onto the subscription so future cancellations resolve to
      // this account.
      if (paid.stripeSubscriptionId) {
        try {
          await getStripe().subscriptions.update(paid.stripeSubscriptionId, {
            metadata: { uid, plan: paid.plan ?? "" },
          });
        } catch (err) {
          console.error("Failed to stamp uid on subscription:", err);
        }
      }
    }
  }

  if (created && email) {
    try {
      await sendWelcomeEmail({ to: email, name });
    } catch (err) {
      console.error("Welcome email failed:", err);
    }
  }

  return Response.json({ created, isPaying });
}
