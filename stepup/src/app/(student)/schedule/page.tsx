import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { cancelBookingAction } from "@/lib/actions/class-actions";
import { AttendButton } from "@/components/classes/AttendButton";
import { formatClassWhen, formatDuration } from "@/lib/format";
import { Tag } from "@/components/ui/Pill";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/ui/SubmitButton";

export default async function SchedulePage() {
  const user = await requireRole("STUDENT");

  const bookings = await db.booking.findMany({
    where: { userId: user.id, status: { not: "CANCELLED" } },
    include: {
      class: {
        include: {
          studio: { select: { name: true, address: true, city: true } },
          host: { select: { name: true } },
        },
      },
    },
    orderBy: { class: { startTime: "desc" } },
  });

  const now = new Date();
  const upcoming = bookings.filter(
    (b) => b.status === "BOOKED" && b.class.startTime >= now
  );
  const needsCheckIn = bookings.filter(
    (b) => b.status === "BOOKED" && b.class.startTime < now
  );
  const attended = bookings
    .filter((b) => b.status === "ATTENDED")
    .sort(
      (a, b) => (b.attendedAt?.getTime() ?? 0) - (a.attendedAt?.getTime() ?? 0)
    );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">My schedule</h1>
        <p className="text-sm text-ink-soft">Your booked, pending and completed classes.</p>
      </div>

      <Section title="Upcoming" emptyText="Nothing booked yet — go find a class!">
        {upcoming.map((b) => (
          <Card key={b.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap gap-1.5">
                <Tag tone="brand">{b.class.style}</Tag>
                <Tag tone={b.class.format === "ONLINE" ? "success" : "neutral"}>
                  {b.class.format === "ONLINE" ? "Online" : "In person"}
                </Tag>
              </div>
              <Link href={`/classes/${b.classId}`} className="mt-1 block font-semibold text-ink hover:text-brand">
                {b.class.title}
              </Link>
              <p className="text-sm text-ink-soft">
                {formatClassWhen(b.class.startTime)} · {formatDuration(b.class.durationMin)}
                {b.class.studio ? ` · @ ${b.class.studio.name}` : ` · with ${b.class.host.name}`}
              </p>
              {b.class.format === "ONLINE" && b.class.onlineLink && (
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
          <Card key={b.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap gap-1.5">
                <Tag tone="brand">{b.class.style}</Tag>
                <Tag tone={b.class.format === "ONLINE" ? "success" : "neutral"}>
                  {b.class.format === "ONLINE" ? "Online" : "In person"}
                </Tag>
              </div>
              <p className="mt-1 font-semibold text-ink">{b.class.title}</p>
              <p className="text-sm text-ink-soft">
                {formatClassWhen(b.class.startTime)}
                {b.class.studio ? ` · @ ${b.class.studio.name}` : ` · with ${b.class.host.name}`}
              </p>
            </div>
            {b.class.format === "ONLINE" ? (
              <AttendButton bookingId={b.id} />
            ) : (
              <p className="text-sm text-ink-soft">Waiting for the studio to check you in</p>
            )}
          </Card>
        ))}
      </Section>

      <Section title="Completed" emptyText="Attend a class to start earning points.">
        {attended.map((b) => (
          <Card key={b.id} className="flex items-center justify-between gap-2 p-4">
            <div>
              <p className="font-semibold text-ink">{b.class.title}</p>
              <p className="text-sm text-ink-soft">
                {formatClassWhen(b.class.startTime)}
                {b.class.studio ? ` · @ ${b.class.studio.name}` : ` · with ${b.class.host.name}`}
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
  const items = Array.isArray(children) ? children : [children];
  const isEmpty = (items as unknown[]).flat().length === 0;

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
