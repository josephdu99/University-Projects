import { requireUser } from "@/lib/session";
import { isHost } from "@/lib/roles";
import { startPayoutOnboardingAction } from "@/lib/actions/payout-actions";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/ui/SubmitButton";

/**
 * Stripe sends hosts here when an onboarding link expires before it was
 * completed. Generating a fresh link is the documented recovery.
 */
export default async function PayoutRefreshPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col justify-center px-5 py-16">
      <Card className="flex flex-col gap-4 p-6 text-center">
        <span className="text-4xl">🔗</span>
        <h1 className="text-xl font-bold text-ink">That link expired</h1>
        <p className="text-sm text-ink-soft">
          Stripe onboarding links are single-use and short-lived. Start again to
          pick up where you left off — nothing you entered was lost.
        </p>
        {isHost(user.role) && (
          <form action={startPayoutOnboardingAction}>
            <SubmitButton className="w-full" pendingLabel="Opening Stripe…">
              Continue setup
            </SubmitButton>
          </form>
        )}
      </Card>
    </div>
  );
}
