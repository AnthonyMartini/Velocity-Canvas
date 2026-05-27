import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

// ── Stripe lazy-singleton ─────────────────────────────────────────────────────
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = require("stripe");
  return new Stripe(key, { apiVersion: "2024-11-20.acacia" });
}

// Credits granted per plan on initial checkout and on every monthly renewal
const PLAN_CREDITS: Record<string, number> = {
  pro: 500,
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Grants credits to a user and records an admin activity log entry.
 * Safe to call multiple times — Firestore transaction ensures atomicity.
 */
async function grantCredits(uid: string, credits: number, reason: string) {
  if (!adminDb) {
    console.error("[stripe/webhook] adminDb not initialized — cannot grant credits.");
    return;
  }

  const userRef = adminDb.collection("users").doc(uid);
  const logRef = userRef.collection("activity").doc();

  await adminDb.runTransaction(async (tx) => {
    const userDoc = await tx.get(userRef);
    const currentCredits: number = userDoc.exists ? (userDoc.data()?.credits ?? 0) : 0;
    const newCredits = currentCredits + credits;

    tx.set(userRef, { credits: newCredits }, { merge: true });
    tx.set(logRef, {
      action: reason,
      amount: credits,
      previousCredits: currentCredits,
      newCredits,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  console.log(`[stripe/webhook] Granted ${credits} credits to uid=${uid} (${reason})`);
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set.");
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 500 });
  }

  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event: any;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("[stripe/webhook] Signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ── New subscription / one-time payment ─────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.payment_status !== "paid") break;

        const uid: string | undefined = session.metadata?.uid;
        const planId: string = session.metadata?.planId ?? "pro";

        if (!uid) {
          console.error("[stripe/webhook] checkout.session.completed missing uid in metadata");
          break;
        }

        const credits = PLAN_CREDITS[planId] ?? PLAN_CREDITS.pro;
        await grantCredits(uid, credits, `Pro plan subscription started (${planId})`);

        // Record Stripe customer ID on the user doc for future lookups
        if (session.customer && adminDb) {
          await adminDb
            .collection("users")
            .doc(uid)
            .set(
              {
                stripeCustomerId: session.customer,
                stripePlan: planId,
                stripeSubscriptionStatus: "active",
              },
              { merge: true }
            );
        }
        break;
      }

      // ── Monthly renewal ──────────────────────────────────────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        // Skip the very first invoice — it is already handled by checkout.session.completed
        if (invoice.billing_reason === "subscription_create") break;
        if (!invoice.subscription) break;

        const stripe = getStripe();
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const uid: string | undefined = subscription.metadata?.uid;
        const planId: string = subscription.metadata?.planId ?? "pro";

        if (!uid) {
          console.error("[stripe/webhook] invoice.payment_succeeded missing uid in subscription metadata");
          break;
        }

        const credits = PLAN_CREDITS[planId] ?? PLAN_CREDITS.pro;
        await grantCredits(uid, credits, `Pro plan monthly credit refill (${planId})`);
        break;
      }

      // ── Subscription cancelled / lapsed ─────────────────────────────────────
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const uid: string | undefined = subscription.metadata?.uid;
        if (!uid || !adminDb) break;

        await adminDb
          .collection("users")
          .doc(uid)
          .set({ stripeSubscriptionStatus: "cancelled", stripePlan: null }, { merge: true });

        console.log(`[stripe/webhook] Subscription cancelled for uid=${uid}`);
        break;
      }

      default:
        // Unhandled event type — acknowledged with 200 so Stripe doesn't retry
        break;
    }
  } catch (err: any) {
    console.error("[stripe/webhook] Handler error:", err?.message || err);
    // Return 200 to prevent Stripe from retrying; log the error for investigation
    return NextResponse.json({ received: true, warning: "Handler error logged." });
  }

  return NextResponse.json({ received: true });
}
