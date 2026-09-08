import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Pill";
import { Avatar } from "@/components/ui/Avatar";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatClassWhen, formatMoney } from "@/lib/time";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import {
  suspendUserAction,
  unsuspendUserAction,
  forceVerifyEmailAction,
  adjustPointsAction,
} from "@/lib/actions/admin-actions";

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    include: {
      profile: true,
      studio: true,
      payoutAccount: true,
      badges: { include: { badge: true } },
      bookings: {
        include: {
          class: { select: { title: true, startTime: true, timezone: true } },
          payment: { select: { status: true, amountCents: true, currency: true } },
        },
        orderBy: { bookedAt: "desc" },
        take: 15,
      },
      _count: { select: { hostedClasses: true, bookings: true } },
    },
  });

  if (!user) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Link href="/admin" className="text-sm font-medium text-ink-soft">
        ← Back to Admin
      </Link>

      <Card className="flex items-center gap-4 p-5">
        <Avatar emoji={user.avatarEmoji} color={user.avatarColor} size="lg" />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold text-ink">{user.name}</h1>
          <p className="truncate text-sm text-ink-soft">{user.email}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Tag>{ROLE_LABEL[user.role as Role]}</Tag>
            {user.emailVerifiedAt ? (
              <Tag tone="success">Verified</Tag>
            ) : (
              <Tag tone="gold">Unverified</Tag>
            )}
            {user.suspendedAt && <Tag tone="gold">Suspended</Tag>}
            {user.payoutAccount?.chargesEnabled && <Tag tone="success">Payouts on</Tag>}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 text-center">
          <p className="text-lg font-bold text-ink">{user.profile?.totalPoints ?? 0}</p>
          <p className="text-xs text-ink-soft">Points</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-lg font-bold text-ink">{user.profile?.currentStreak ?? 0}</p>
          <p className="text-xs text-ink-soft">Streak</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-lg font-bold text-ink">{user._count.bookings}</p>
          <p className="text-xs text-ink-soft">Bookings</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-lg font-bold text-ink">{user._count.hostedClasses}</p>
          <p className="text-xs text-ink-soft">Hosted</p>
        </Card>
      </div>

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="font-bold text-ink">Moderation</h2>

        {user.suspendedAt ? (
          <>
            <p className="text-sm text-ink-soft">
              Suspended{user.suspendedReason ? `, ${user.suspendedReason}` : ""}.
              They can&apos;t sign in.
            </p>
            <form action={unsuspendUserAction.bind(null, user.id)}>
              <SubmitButton size="sm" variant="secondary" pendingLabel="…">
                Lift suspension
              </SubmitButton>
            </form>
          </>
        ) : user.id === admin.id ? (
          <p className="text-sm text-ink-soft">
            This is your own account, suspension is disabled.
          </p>
        ) : (
          <form
            action={suspendUserAction.bind(null, user.id)}
            className="flex flex-col gap-2"
          >
            <input
              name="reason"
              placeholder="Reason (recorded in the audit log)"
              className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-brand"
            />
            <SubmitButton size="sm" variant="danger" pendingLabel="…">
              Suspend account
            </SubmitButton>
          </form>
        )}

        {!user.emailVerifiedAt && (
          <form action={forceVerifyEmailAction.bind(null, user.id)}>
            <SubmitButton size="sm" variant="ghost" pendingLabel="…">
              Mark email verified
            </SubmitButton>
          </form>
        )}

        <form
          action={adjustPointsAction.bind(null, user.id)}
          className="flex items-end gap-2"
        >
          <label className="flex flex-1 flex-col gap-1 text-xs text-ink-soft">
            Adjust points (+/-)
            <input
              name="delta"
              type="number"
              placeholder="e.g. -25"
              className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-brand"
            />
          </label>
          <SubmitButton size="sm" variant="secondary" pendingLabel="…">
            Apply
          </SubmitButton>
        </form>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-bold text-ink">Recent bookings</h2>
        {user.bookings.length === 0 ? (
          <p className="rounded-2xl bg-surface-muted p-5 text-center text-sm text-ink-soft">
            No bookings.
          </p>
        ) : (
          <Card className="divide-y divide-border">
            {user.bookings.map((b) => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {b.class.title}
                  </p>
                  <p className="truncate text-xs text-ink-soft">
                    {formatClassWhen(b.class.startTime, b.class.timezone)}
                    {b.payment &&
                      ` · ${formatMoney(b.payment.amountCents, b.payment.currency)} (${b.payment.status})`}
                  </p>
                </div>
                <Tag>{b.status}</Tag>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
