import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { cancelBookingAction } from "@/lib/actions/class-actions";
import { AttendButton } from "@/components/classes/AttendButton";
import { formatClassWhen, formatDuration, formatMoney } from "@/lib/time";
import { Tag } from "@/components/ui/Pill";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { publicName } from "@/lib/roles";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string }>;
}) {
  const user = await requireRole("STUDENT");
  const { paid } = await searchParams;
  const tz = user.timezone;

  const bookings = await db.booking.findMany({
    where: { userId: user.id, status: { not: "CANCELLED" } },
    include: {
      class: {
        include: {
          studio: { select: { name: true, address: true, city: true } },
          host: { select: { name: true, displayName: true } },
        },
      },
      payment: { select: { status: true, amountCents: true, currency: true } },
    },
    orderBy: { class: { startTime: "desc" } },
  });

  const now = new Date();
  const upcoming = bookings.filter(
    (b) => ["BOOKED", "PENDING_PAYMENT", "WAITLISTED"].includes(b.status) && b.class.startTime >= now
  );
  const needsCheckIn = bookings.filter(
    (b) => b.status === "BOOKED" && b.class.startTime < now
  );
  const attended = bookings
    .filter((b) => b.status === "ATTENDED")
    .sort((a, b) => (b.attendedAt?.getTime() ?? 0) - (a.attendedAt?.getTime() ?? 0));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">My schedule</h1>
        <p className="text-sm text-ink-soft">
          Your booked, pending and completed classes.
        </p>
      </div>

      {paid === "1" && (
        <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
          Payment received — you&apos;re booked in. 🎉
        </p>
      )}

      <Section title="Upcoming" emptyText="Nothing booked yet — go find a class!">
        {upcoming.map((b) => (
          <Card
            key={b.id}
            className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="flex flex-wrap gap-1.5">
                <Tag tone="brand">{b.class.style}</Tag>
                <Tag tone={b.class.format === "ONLINE" ? "success" : "neutral"}>
                  {b.class.format === "ONLINE" ? "Online" : "In person"}
                </Tag>
                {b.status === "WAITLISTED" && (
                  <Tag tone="gold">Waitlist #{b.waitlistPosition ?? "—"}</Tag>
                )}
                {b.status === "PENDING_PAYMENT" && <Tag>Payment pending</Tag>}
              </div>
              <Link
                href={`/classes/${b.classId}`}
                className="mt-1 block font-semibold text-ink hover:text-brand"
              >
                {b.class.title}
              </Link>
              <p className="text-sm text-ink-soft">
                {formatClassWhen(b.class.startTime, tz)} ·{" "}
                {formatDuration(b.class.durationMin)}
                {b.class.studio
                  ? ` · @ ${b.class.studio.name}`
                  : ` · with ${publicName(b.class.host)}`}
              </p>
              {b.status === "BOOKED" &&
                b.class.format === "ONLINE" &&
                b.class.onlineLink && (
                  <a
                    href={b.class.onlineLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-sm font-semibold text-brand"
                  >
                    Join link →
                  </a>
                )}
            </div>
            <form action={cancelBookingAction.bind(null, b.id)}>
              <SubmitButton variant="ghost" size="sm" pendingLabel="Cancelling…">
                Cancel
              </SubmitButton>
            </form>
          </Card>
        ))}
      </Section>

      <Section title="Awaiting check-in" emptyText="Nothing to check in.">
        {needsCheckIn.map((b) => (
          <Card
            key={b.id}
            className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="flex flex-wrap gap-1.5">
                <Tag tone="brand">{b.class.style}</Tag>
                <Tag tone={b.class.format === "ONLINE" ? "success" : "neutral"}>
                  {b.class.format === "ONLINE" ? "Online" : "In person"}
                </Tag>
              </div>
              <p className="mt-1 font-semibold text-ink">{b.class.title}</p>
              <p className="text-sm text-ink-soft">
                {formatClassWhen(b.class.startTime, tz)}
                {b.class.studio
                  ? ` · @ ${b.class.studio.name}`
                  : ` · with ${publicName(b.class.host)}`}
              </p>
            </div>
            {b.class.format === "ONLINE" ? (
              <AttendButton bookingId={b.id} />
            ) : (
              <p className="text-sm text-ink-soft">
                Waiting for the studio to check you in
              </p>
            )}
          </Card>
        ))}
      </Section>

      <Section
        title="Completed"
        emptyText="Attend a class to start earning points."
      >
        {attended.map((b) => (
          <Card key={b.id} className="flex items-center justify-between gap-2 p-4">
            <div>
              <p className="font-semibold text-ink">{b.class.title}</p>
              <p className="text-sm text-ink-soft">
                {formatClassWhen(b.class.startTime, tz)}
                {b.class.studio
                  ? ` · @ ${b.class.studio.name}`
                  : ` · with ${publicName(b.class.host)}`}
                {b.payment?.status === "PAID" &&
                  ` · ${formatMoney(b.payment.amountCents, b.payment.currency)}`}
              </p>
            </div>
            <Tag tone="gold">+{b.class.points} pts</Tag>
          </Card>
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  emptyText,
  children,
}: {
  title: string;
  emptyText: string;
  children: React.ReactNode;
}) {
  const items = (Array.isArray(children) ? children : [children]).flat();
  const isEmpty = items.filter(Boolean).length === 0;

  return (
    <div>
      <h2 className="mb-3 text-lg font-bold text-ink">{title}</h2>
      {isEmpty ? (
        <p className="rounded-2xl bg-surface-muted p-5 text-center text-sm text-ink-soft">
          {emptyText}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">{children}</div>
      )}
    </div>
  );
}
