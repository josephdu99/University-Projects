import Stripe from "stripe";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/email";
import { logError, logInfo } from "@/lib/logger";

/**
 * Percentage of each class fee StepUp keeps. The rest is transferred to the
 * host's connected account automatically by Stripe.
 */
export const PLATFORM_FEE_PERCENT = Number(
  process.env.PLATFORM_FEE_PERCENT ?? 10
);

let cached: Stripe | null = null;

export function stripeClient(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set, paid classes are unavailable until it is configured."
    );
  }
  // Pinned to the version this SDK was built against. Bumping the SDK will
  // surface a type error here on purpose, so API changes get reviewed.
  cached = new Stripe(key, { apiVersion: "2026-06-24.dahlia" });
  return cached;
}

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function platformFeeCents(amountCents: number) {
  return Math.round((amountCents * PLATFORM_FEE_PERCENT) / 100);
}

// ─── Connect onboarding ──────────────────────────────────────────────────────

/**
 * Creates (or reuses) an Express connected account for a host and returns the
 * hosted onboarding link they need to complete.
 */
export async function createOnboardingLink(userId: string): Promise<string> {
  const stripe = stripeClient();

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: { payoutAccount: true },
  });

  let accountId = user.payoutAccount?.stripeAccountId;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      country: "AU",
      default_currency: "aud",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      metadata: { userId },
    });
    accountId = account.id;

    await db.payoutAccount.create({
      data: { userId, stripeAccountId: accountId, status: "ONBOARDING" },
    });
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: appUrl("/payouts/refresh"),
    return_url: appUrl("/payouts/return"),
    type: "account_onboarding",
  });

  return link.url;
}

/** Pulls the latest capability flags from Stripe into our own record. */
export async function syncPayoutAccount(stripeAccountId: string) {
  const stripe = stripeClient();
  const account = await stripe.accounts.retrieve(stripeAccountId);

  const status = account.charges_enabled
    ? "ACTIVE"
    : account.details_submitted
      ? "RESTRICTED"
      : "ONBOARDING";

  await db.payoutAccount.updateMany({
    where: { stripeAccountId },
    data: {
      status,
      chargesEnabled: Boolean(account.charges_enabled),
      payoutsEnabled: Boolean(account.payouts_enabled),
      detailsSubmitted: Boolean(account.details_submitted),
      country: account.country ?? "AU",
      defaultCurrency: account.default_currency ?? "aud",
    },
  });

  return status;
}

export async function createLoginLink(stripeAccountId: string): Promise<string> {
  const stripe = stripeClient();
  const link = await stripe.accounts.createLoginLink(stripeAccountId);
  return link.url;
}

// ─── Checkout ────────────────────────────────────────────────────────────────

/**
 * Starts a Checkout session for a paid class. Funds go directly to the host's
 * connected account with the platform fee split off.
 *
 * The booking stays PENDING_PAYMENT until the webhook confirms payment, so a
 * user who abandons checkout never occupies a confirmed seat.
 */
export async function createCheckoutSession(params: {
  bookingId: string;
  classId: string;
  classTitle: string;
  amountCents: number;
  currency: string;
  destinationAccountId: string;
  customerEmail?: string;
}): Promise<string> {
  const stripe = stripeClient();
  const fee = platformFeeCents(params.amountCents);

  const payment = await db.payment.upsert({
    where: { bookingId: params.bookingId },
    create: {
      bookingId: params.bookingId,
      amountCents: params.amountCents,
      feeCents: fee,
      currency: params.currency,
      status: "PENDING",
    },
    update: { amountCents: params.amountCents, feeCents: fee, status: "PENDING" },
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: params.currency,
          unit_amount: params.amountCents,
          product_data: { name: params.classTitle },
        },
      },
    ],
    payment_intent_data: {
      application_fee_amount: fee,
      transfer_data: { destination: params.destinationAccountId },
metadata: { bookingId: params.bookingId, paymentId: payment.id },
    },
    customer_email: params.customerEmail,
    metadata: { bookingId: params.bookingId, paymentId: payment.id },
    success_url: appUrl(`/schedule?paid=1`),
    cancel_url: appUrl(`/classes/${params.classId}?cancelled=1`),
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });

  await db.payment.update({
    where: { id: payment.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

// ─── Refunds ─────────────────────────────────────────────────────────────────

export async function refundPayment(paymentId: string): Promise<void> {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return;
  if (payment.status !== "PAID") return;
  if (!payment.stripePaymentIntentId) return;

  const stripe = stripeClient();

  const refund = await stripe.refunds.create({
    payment_intent: payment.stripePaymentIntentId,
    // Pull the platform fee back too, so a refunded class costs the host
    // nothing rather than leaving them out of pocket for our cut.
    refund_application_fee: true,
    reverse_transfer: true,
  });

  await db.payment.update({
    where: { id: paymentId },
    data: {
      status: "REFUNDED",
      refundedAt: new Date(),
      stripeRefundId: refund.id,
    },
  });

  logInfo("stripe.refunded", { paymentId, refundId: refund.id });
}

// ─── Webhook handling ────────────────────────────────────────────────────────

export function constructWebhookEvent(payload: string, signature: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return stripeClient().webhooks.constructEvent(payload, signature, secret);
}

/**
 * Applies a Stripe event exactly once.
 *
 * Stripe retries deliveries and can send duplicates, so every event id is
 * recorded; a repeat delivery short-circuits before any side effects run.
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  const seen = await db.processedWebhookEvent.findUnique({
    where: { id: event.id },
  });
  if (seen) {
    logInfo("stripe.webhookDuplicate", { id: event.id, type: event.type });
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.bookingId;
        if (!bookingId) break;

        await db.$transaction(async (tx) => {
          await tx.payment.updateMany({
            where: { bookingId },
            data: {
              status: "PAID",
              paidAt: new Date(),
              stripePaymentIntentId:
                typeof session.payment_intent === "string"
                  ? session.payment_intent
                  : (session.payment_intent?.id ?? null),
            },
          });
          // Only confirm a seat that is still awaiting payment.
          await tx.booking.updateMany({
            where: { id: bookingId, status: "PENDING_PAYMENT" },
            data: { status: "BOOKED" },
          });
        });

        logInfo("stripe.paymentSucceeded", { bookingId });
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.bookingId;
        if (!bookingId) break;

        // Release the held seat so someone else can take it.
        await db.$transaction(async (tx) => {
          await tx.payment.updateMany({
            where: { bookingId },
            data: { status: "FAILED", failureReason: "Checkout expired" },
          });
          await tx.booking.updateMany({
            where: { id: bookingId, status: "PENDING_PAYMENT" },
            data: { status: "CANCELLED", cancelledAt: new Date() },
          });
        });
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const bookingId = intent.metadata?.bookingId;
        if (!bookingId) break;

        await db.payment.updateMany({
          where: { bookingId },
          data: {
            status: "FAILED",
            failureReason: intent.last_payment_error?.message ?? "Payment failed",
          },
        });
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await syncPayoutAccount(account.id);
        break;
      }

      default:
        logInfo("stripe.webhookIgnored", { type: event.type });
    }

    await db.processedWebhookEvent.create({
      data: { id: event.id, type: event.type },
    });
  } catch (err) {
    logError("stripe.webhookFailed", err, { id: event.id, type: event.type });
    // Rethrow so Stripe retries — the event is deliberately not marked
    // processed, keeping delivery at-least-once.
    throw err;
  }
}
