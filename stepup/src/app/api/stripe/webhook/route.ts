import { NextResponse } from "next/server";
import { constructWebhookEvent, handleWebhookEvent } from "@/lib/stripe";
import { logError } from "@/lib/logger";

// Stripe signs the raw body — Next must not parse or transform it.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await request.text();

  let event;
  try {
    event = constructWebhookEvent(payload, signature);
  } catch (err) {
    // A bad signature means the request didn't come from Stripe.
    logError("stripe.badSignature", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await handleWebhookEvent(event);
  } catch {
    // Non-2xx tells Stripe to retry with backoff.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
