import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase-admin";

// ── Stripe lazy-singleton (only initialised on first request) ─────────────────
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
  // Dynamic import so the module is resolved at runtime, not build time
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = require("stripe");
  return new Stripe(key, { apiVersion: "2024-11-20.acacia" });
}

const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID ?? "";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const uid = await verifyIdToken(authHeader.split("Bearer ")[1]);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized: invalid token" }, { status: 401 });
    }

    // ── Body ──────────────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const { email, planId = "pro" } = body as { email?: string; planId?: string };

    if (!PRO_PRICE_ID) {
      return NextResponse.json(
        { error: "Billing is not yet configured on this server." },
        { status: 503 }
      );
    }

    const origin = req.headers.get("origin") ?? "https://www.velocitycanvas.com";

    const stripe = getStripe();

    // ── Create Checkout Session ───────────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
      ...(email ? { customer_email: email } : {}),
      metadata: { uid, planId },
      success_url: `${origin}/plans?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/plans?checkout=cancelled`,
      subscription_data: {
        metadata: { uid, planId },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("[stripe/checkout] Error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Failed to create checkout session." },
      { status: 500 }
    );
  }
}
