import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { bookClassAction, cancelBookingAction } from "@/lib/actions/class-actions";
import { formatClassWhen, formatDuration } from "@/lib/format";
import { LEVEL_LABEL } from "@/lib/roles";
import { Tag } from "@/components/ui/Pill";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/ui/SubmitButton";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("STUDENT");
  const { id } = await params;

  const danceClass = await db.danceClass.findUnique({
    where: { id },
    include: {
      host: { select: { id: true, name: true, bio: true, avatarEmoji: true, avatarColor: true } },
      studio: true,
      _count: { select: { bookings: { where: { status: { not: "CANCELLED" } } } } },
    },
  });
  if (!danceClass) notFound();

  const myBooking = await db.booking.findUnique({
    where: { userId_classId: { userId: user.id, classId: id } },
  });

  const spotsLeft = danceClass.capacity - danceClass._count.bookings;
  const isFull = spotsLeft <= 0;
  const isPast = danceClass.startTime < new Date();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Link href="/discover" className="text-sm font-medium text-ink-soft">
        ← Back to Discover
      </Link>

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap gap-1.5">
          <Tag tone="brand">{danceClass.style}</Tag>
          <Tag tone={danceClass.format === "ONLINE" ? "success" : "neutral"}>
            {danceClass.format === "ONLINE" ? "Online" : "In person"}
          </Tag>
          <Tag>{LEVEL_LABEL[danceClass.level as keyof typeof LEVEL_LABEL] ?? danceClass.level}</Tag>
          <Tag tone="gold">⚡ {danceClass.points} pts</Tag>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-ink">{danceClass.title}</h1>
          <p className="mt-1 text-ink-soft">
            {formatClassWhen(danceClass.startTime)} · {formatDuration(danceClass.durationMin)}
          </p>
        </div>

        <p className="text-sm leading-relaxed text-ink">{danceClass.description}</p>

        <div className="flex items-center gap-3 rounded-2xl bg-surface-muted p-3">
          <Avatar emoji={danceClass.host.avatarEmoji} color={danceClass.host.avatarColor} />
          <div>
            <p className="text-sm font-semibold text-ink">
              {danceClass.studio ? danceClass.studio.name : danceClass.host.name}
            </p>
            <p className="text-xs text-ink-soft">
              {danceClass.studio
                ? `${danceClass.studio.address}, ${danceClass.studio.city}`
                : `Hosted by ${danceClass.host.name}`}
            </p>
          </div>
        </div>

        {danceClass.format === "ONLINE" && myBooking && (
          <p className="text-sm text-ink-soft">
            The join link will appear on your{" "}
            <Link href="/schedule" className="font-semibold text-brand">
              Schedule
            </Link>{" "}
            once you&apos;re booked.
          </p>
        )}

        <div className="flex items-center justify-between text-sm text-ink-soft">
          <span>
            {danceClass.capacity} spots total ·{" "}
            <span className={isFull ? "font-medium text-red-500" : ""}>
              {isFull ? "Full" : `${spotsLeft} left`}
            </span>
          </span>
        </div>

        {isPast ? (
          <div className="rounded-full bg-surface-muted py-2.5 text-center text-sm font-semibold text-ink-soft">
            This class has ended
          </div>
        ) : myBooking ? (
          <form action={cancelBookingAction.bind(null, myBooking.id)}>
            <SubmitButton variant="secondary" className="w-full" pendingLabel="Cancelling…">
              Cancel booking
            </SubmitButton>
          </form>
        ) : (
          <form action={bookClassAction.bind(null, danceClass.id)}>
            <SubmitButton className="w-full" size="lg" disabled={isFull} pendingLabel="Booking…">
              {isFull ? "Class full" : "Book this class"}
            </SubmitButton>
          </form>
        )}
      </Card>
    </div>
  );
}
