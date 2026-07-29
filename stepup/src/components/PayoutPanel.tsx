import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Tag } from "@/components/ui/Pill";
import { formatMoney } from "@/lib/time";
import {
  startPayoutOnboardingAction,
  openPayoutDashboardAction,
} from "@/lib/actions/payout-actions";

export function PayoutPanel({
  status,
  chargesEnabled,
  payoutsEnabled,
  netEarningsCents,
}: {
  status: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  netEarningsCents: number;
}) {
  const active = chargesEnabled && payoutsEnabled;

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-ink">Payouts</h2>
        {active ? (
          <Tag tone="success">Active</Tag>
        ) : status ? (
          <Tag tone="gold">Setup incomplete</Tag>
        ) : (
          <Tag>Not set up</Tag>
        )}
      </div>

      {active ? (
        <>
          <p className="text-sm text-ink-soft">
            You&apos;ve earned{" "}
            <span className="font-semibold text-ink">
              {formatMoney(netEarningsCents)}
            </span>{" "}
            after platform fees. Stripe pays out to your bank on its normal
            schedule.
          </p>
          <form action={openPayoutDashboardAction}>
            <SubmitButton variant="secondary" size="sm" pendingLabel="Opening…">
              Open Stripe dashboard
            </SubmitButton>
          </form>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-soft">
            Connect a Stripe account to charge for classes and get paid
            directly. Free classes work without this.
          </p>
          <form action={startPayoutOnboardingAction}>
            <SubmitButton size="sm" pendingLabel="Opening Stripe…">
              {status ? "Finish payout setup" : "Set up payouts"}
            </SubmitButton>
          </form>
        </>
      )}
    </Card>
  );
}
