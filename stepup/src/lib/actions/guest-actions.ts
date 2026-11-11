"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { reserveSeat } from "@/lib/booking";
import { createCheckoutSession } from "@/lib/stripe";
import { issueToken, TOKEN_PURPOSE } from "@/lib/tokens";
import { checkRateLimit, hashIp } from "@/lib/rate-limit";
import { sendGuestBookingConfirmation } from "@/lib/email";
import { logError, logWarn } from "@/lib/logger";
import { DEFAULT_TIMEZONE } from "@/lib/time";

export type GuestBookState =
  | { error: string; needsLogin?: boolean }
  | undefined;

const schema = z.object({
  name: z.string().trim().min(1, "Tell us your name.").max(80),
  email: z.string().trim().toLowerCase().email("That email doesn't look right."),
});

/**
 * Book a class without an account.
 *
 * The seat still belongs to a User, because everything downstream (capacity,
 * the waitlist, check-in, cancellation, the host's roster) is built on one.
 * A guest is simply a User that has never had a password set. They claim it
 * later by setting one, through the ordinary password-reset email.
 *
 * Two rules keep this from becoming a way into somebody else's account:
 *
 *  1. An email that already belongs to an account WITH a password is never
 *     booked against. We stop and ask them to log in. Otherwise anyone could
 *     type a stranger's address and attach themselves to that account.
 *  2. The link this hands back is read-and-cancel only, never a session, and
 *     it cannot set a password. Claiming the account always requires the
 *     email itself, which is the only proof we have that the address is
 *     theirs.
 */
export async function bookAsGuestAction(
  _prev: GuestBookState,
  formData: FormData,
): Promise<GuestBookState> {
  // A signed-in dancer has no business here; they book as themselves.
  const current = await getSessionUser();
  if (current) {
    return { error: "You're signed in. Use the booking button instead." };
  }

  const classId = formData.get("classId");
  if (typeof classId !== "string") return { error: "Missing class." };

  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }
  const { name, email } = parsed.data;

  // Guest booking is unauthenticated and creates rows, so it is rate limited
  // on the caller's IP as well as the address being booked against.
  const ip = hashIp((await headers()).get("x-forwarded-for"));
  for (const key of [`guest-book:ip:${ip ?? "unknown"}`, `guest-book:email:${email}`]) {
    const limit = await checkRateLimit(key, 5, 15 * 60 * 1000);
    if (!limit.allowed) {
      logWarn("guestBooking.rateLimited", { key });
      return { error: "Too many attempts just now. Try again in a few minutes." };
    }
  }

  const danceClass = await db.danceClass.findUnique({
    where: { id: classId },
    select: {
      id: true,
      title: true,
      startTime: true,
      timezone: true,
      priceCents: true,
      currency: true,
      cancelledAt: true,
      host: {
        select: {
          payoutAccount: {
            select: { stripeAccountId: true, chargesEnabled: true },
          },
        },
      },
    },
  });
  if (!danceClass || danceClass.cancelledAt) return { error: "Class not found." };

  const isPaid = danceClass.priceCents > 0;
  if (isPaid && !danceClass.host.payoutAccount?.chargesEnabled) {
    return {
      error: "This host isn't set up to take payments yet. Try again later.",
    };
  }

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, role: true, suspendedAt: true },
  });

  if (existing?.suspendedAt) {
    return { error: "That account can't book classes. Get in touch with us." };
  }
  // Rule 1: a real account is never booked against by a stranger.
  if (existing?.passwordHash) {
    return {
      error: "That email already has an account. Log in and the class is one tap away.",
      needsLogin: true,
    };
  }
  if (existing && existing.role !== "STUDENT") {
    return { error: "That email belongs to a host account. Log in instead.", needsLogin: true };
  }

  const guest =
    existing ??
    (await db.user.create({
      data: {
        email,
        name,
        role: "STUDENT",
        passwordHash: null,
        timezone: DEFAULT_TIMEZONE,
      },
      select: { id: true, passwordHash: true, role: true, suspendedAt: true },
    }));

  const outcome = await reserveSeat({
    userId: guest.id,
    classId: danceClass.id,
    requiresPayment: isPaid,
  });
  if (!outcome.ok) return { error: outcome.reason };

  const token = await issueToken(guest.id, TOKEN_PURPOSE.GUEST_BOOKING);

  if (outcome.status === "PENDING_PAYMENT") {
    const url = await createCheckoutSession({
      bookingId: outcome.bookingId,
      classId: danceClass.id,
      classTitle: danceClass.title,
      amountCents: danceClass.priceCents,
      currency: danceClass.currency,
      destinationAccountId: danceClass.host.payoutAccount!.stripeAccountId,
      customerEmail: email,
    });
    redirect(url);
  }

  await sendGuestBookingConfirmation({
    to: email,
    name,
    classTitle: danceClass.title,
    startTime: danceClass.startTime,
    timezone: danceClass.timezone,
    classId: danceClass.id,
    token,
  }).catch((err) => logError("email.guestBookingConfirmation", err));

  redirect(`/first-class/${danceClass.id}/booked?t=${encodeURIComponent(token)}`);
}
