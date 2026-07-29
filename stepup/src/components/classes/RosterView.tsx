import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  checkInStudentAction,
  openCheckInAction,
  cancelClassAction,
} from "@/lib/actions/class-actions";
import {
  formatClassWhenLong,
  formatDuration,
  formatMoney,
} from "@/lib/time";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Pill";
import { SubmitButton } from "@/components/ui/SubmitButton";

export async function RosterView({
  classId,
  hostId,
  basePath,
}: {
  classId: string;
  hostId: string;
  basePath: "/studio" | "/teach";
}) {
  const danceClass = await db.danceClass.findUnique({
    where: { id: classId },
    include: {
      bookings: {
        where: { status: { not: "CANCELLED" } },
        include: {
          user: {
            select: { id: true, name: true, avatarEmoji: true, avatarColor: true },
          },
          payment: { select: { status: true, amountCents: true, currency: true } },
        },
        orderBy: [{ waitlistPosition: "asc" }, { bookedAt: "asc" }],
      },
    },
  });

  if (!danceClass || danceClass.hostId !== hostId) notFound();

  const confirmed = danceClass.bookings.filter((b) =>
    ["BOOKED", "ATTENDED", "PENDING_PAYMENT"].includes(b.status)
  );
  const waitlisted = danceClass.bookings.filter((b) => b.status === "WAITLISTED");
  const attendedCount = danceClass.bookings.filter(
    (b) => b.status === "ATTENDED"
  ).length;

  const hasStarted = danceClass.startTime <= new Date();
  const isCancelled = Boolean(danceClass.cancelledAt);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Link href={basePath} className="text-sm font-medium text-ink-soft">
        ← Back to Dashboard
      </Link>

      <Card className="flex flex-col gap-2 p-5">
        <div className="flex flex-wrap gap-1.5">
          <Tag tone="brand">{danceClass.style}</Tag>
          <Tag tone={danceClass.format === "ONLINE" ? "success" : "neutral"}>
            {danceClass.format === "ONLINE" ? "Online" : "In person"}
          </Tag>
          {isCancelled && <Tag>Cancelled</Tag>}
        </div>
        <h1 className="text-xl font-extrabold text-ink">{danceClass.title}</h1>
        <p className="text-sm text-ink-soft">
          {formatClassWhenLong(danceClass.startTime, danceClass.timezone)} ·{" "}
          {formatDuration(danceClass.durationMin)}
        </p>
        <p className="text-sm font-semibold text-ink-soft">
          {attendedCount} checked in · {confirmed.length}/{danceClass.capacity} booked
          {waitlisted.length > 0 && ` · ${waitlisted.length} waiting`}
          {danceClass.priceCents > 0 &&
            ` · ${formatMoney(danceClass.priceCents, danceClass.currency)}`}
        </p>
      </Card>

      {!isCancelled && danceClass.format === "ONLINE" && (
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="font-bold text-ink">Online check-in</h2>
          {danceClass.checkInCode ? (
            <>
              <p className="text-sm text-ink-soft">
                Read this code out during class. Students enter it to claim
                their points.
              </p>
              <p className="rounded-2xl bg-brand-light py-4 text-center text-3xl font-extrabold tracking-[0.3em] text-brand-dark">
                {danceClass.checkInCode}
              </p>
              <form action={openCheckInAction.bind(null, danceClass.id)}>
                <SubmitButton variant="ghost" size="sm" pendingLabel="Rotating…">
                  Generate a new code
                </SubmitButton>
              </form>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-soft">
                Generate a code when class starts so only people actually in the
                room can claim points.
              </p>
              <form action={openCheckInAction.bind(null, danceClass.id)}>
                <SubmitButton
                  size="sm"
                  disabled={!hasStarted}
                  pendingLabel="Generating…"
                >
                  {hasStarted ? "Open check-in" : "Available when class starts"}
                </SubmitButton>
              </form>
            </>
          )}
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-lg font-bold text-ink">Roster</h2>
        {confirmed.length === 0 ? (
          <p className="rounded-2xl bg-surface-muted p-5 text-center text-sm text-ink-soft">
            No bookings yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {confirmed.map((b) => (
              <Card key={b.id} className="flex items-center gap-3 p-3.5">
                <Avatar
                  emoji={b.user.avatarEmoji}
                  color={b.user.avatarColor}
                  size="sm"
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-ink">
                    {b.user.name}
                  </span>
                  {b.status === "PENDING_PAYMENT" && (
                    <p className="text-xs text-ink-soft">Awaiting payment</p>
                  )}
                </div>
                {b.status === "ATTENDED" ? (
                  <Tag tone="success">Attended ✓</Tag>
                ) : b.status === "PENDING_PAYMENT" ? (
                  <Tag>Unpaid</Tag>
                ) : (
                  <form action={checkInStudentAction.bind(null, b.id)}>
                    <SubmitButton
                      variant="secondary"
                      size="sm"
                      pendingLabel="Checking in…"
                    >
                      Check in
                    </SubmitButton>
                  </form>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {waitlisted.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-bold text-ink">Waitlist</h2>
          <div className="flex flex-col gap-2.5">
            {waitlisted.map((b) => (
              <Card key={b.id} className="flex items-center gap-3 p-3.5">
                <span className="w-6 text-center text-sm font-bold text-ink-soft">
                  {b.waitlistPosition}
                </span>
                <Avatar
                  emoji={b.user.avatarEmoji}
                  color={b.user.avatarColor}
                  size="sm"
                />
                <span className="flex-1 text-sm font-semibold text-ink">
                  {b.user.name}
                </span>
                <Tag tone="gold">Waiting</Tag>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!isCancelled && !hasStarted && (
        <Card className="flex flex-col gap-3 border-red-200 p-5">
          <h2 className="font-bold text-ink">Cancel this class</h2>
          <p className="text-sm text-ink-soft">
            Everyone booked is emailed automatically, and any payments are
            refunded in full.
          </p>
          <form action={cancelClassAction.bind(null, danceClass.id)} className="flex flex-col gap-2">
            <input
              name="reason"
              placeholder="Reason (optional, shared with students)"
              className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-brand"
            />
            <SubmitButton variant="danger" size="sm" pendingLabel="Cancelling…">
              Cancel class
            </SubmitButton>
          </form>
        </Card>
      )}
    </div>
  );
}
