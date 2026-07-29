import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ROLE_HOME } from "@/lib/roles";
import { syncPayoutAccount } from "@/lib/stripe";
import { logError } from "@/lib/logger";

/** Stripe redirects here when a host finishes (or exits) onboarding. */
export default async function PayoutReturnPage() {
  const user = await requireUser();

  const account = await db.payoutAccount.findUnique({
    where: { userId: user.id },
  });

  if (account) {
    try {
      await syncPayoutAccount(account.stripeAccountId);
    } catch (err) {
      logError("stripe.syncOnReturn", err, { userId: user.id });
    }
  }

  redirect(ROLE_HOME[user.role]);
}
