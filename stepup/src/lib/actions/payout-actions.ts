"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { isHost } from "@/lib/roles";
import {
  createOnboardingLink,
  createLoginLink,
  syncPayoutAccount,
  stripeConfigured,
} from "@/lib/stripe";
import { logError } from "@/lib/logger";

/** Starts (or resumes) Stripe Connect onboarding for a host. */
export async function startPayoutOnboardingAction(): Promise<void> {
  const user = await requireUser();
  if (!isHost(user.role)) return;
  if (!stripeConfigured()) return;

  let url: string;
  try {
    url = await createOnboardingLink(user.id);
  } catch (err) {
    logError("stripe.onboardingFailed", err, { userId: user.id });
    return;
  }
  redirect(url);
}

/** Opens the host's Stripe Express dashboard. */
export async function openPayoutDashboardAction(): Promise<void> {
  const user = await requireUser();
  const account = await db.payoutAccount.findUnique({ where: { userId: user.id } });
  if (!account) return;

  let url: string;
  try {
    url = await createLoginLink(account.stripeAccountId);
  } catch (err) {
    logError("stripe.loginLinkFailed", err, { userId: user.id });
    return;
  }
  redirect(url);
}

/** Re-reads capability flags from Stripe (used on return from onboarding). */
export async function refreshPayoutStatusAction(): Promise<void> {
  const user = await requireUser();
  const account = await db.payoutAccount.findUnique({ where: { userId: user.id } });
  if (!account) return;

  try {
    await syncPayoutAccount(account.stripeAccountId);
  } catch (err) {
    logError("stripe.syncFailed", err, { userId: user.id });
  }

  revalidatePath("/studio");
  revalidatePath("/teach");
}
