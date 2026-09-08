import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { cancelBookingAction } from "@/lib/actions/class-actions";
import { countSeats } from "@/lib/booking";
import {
  formatClassWhenLong,
  formatDuration,
  formatMoney,
} from "@/lib/time";
import { LEVEL_LABEL, publicName } from "@/lib/roles";
import { Tag } from "@/components/ui/Pill";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { BookButton } from "@/components/classes/BookButton";

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const user = await requireRole("STUDENT");
  const { id } = await params;
  const { cancelled } = await searchParams;

  const danceClass = await db.danceClass.findUnique({
    where: { id },
    include: {
      host: {
        select: {
          id: true,
          name: true,
          displayName: true,
          bio: true,
          avatarEmoji: true,
          avatarColor: true,
        },
      },
      studio: true,
    },
  });
  if (!danceClass) notFound();

  const [myBooking, seats] = await Promise.all([
    db.booking.findUnique({
      where: { userId_classId: { userId: user.id, classId: id } },
    }),
    countSeats(id),
  ]);

  const spotsLeft = danceClass.capacity - seats.taken;
  const isFull = spotsLeft <= 0;
  const isPast = danceClass.startTime < new Date();
  const isCancelled = Boolean(danceClass.cancelledAt);
  const activeBooking =
    myBooking && myBooking.status !== "CANCELLED" ? myBooking : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Link href="/discover" className="text-sm font-medium text-ink-soft">
        ← Back to Discover
      </Link>

      {cancelled === "1" && (
        <p className="rounded-2xl bg-surface-muted px-4 py-3 text-sm text-ink-soft">
          Payment cancelled, your spot wasn&apos;t reserved.
        </p>
      )}

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap gap-1.5">
          <Tag tone="brand">{danceClass.style}</Tag>
          <Tag tone={danceClass.format === "ONLINE" ? "success" : "neutral"}>
            {danceClass.format === "ONLINE" ? "Online" : "In person"}
          </Tag>
          <Tag>
            {LEVEL_LABEL[danceClass.level as keyof typeof LEVEL_LABEL] ??
              danceClass.level}
          </Tag>
          <Tag tone="gold">⚡ {danceClass.points} pts</Tag>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-ink">{danceClass.title}</h1>
          <p className="mt-1 text-ink-soft">
            {/* Shown in the class's own zone so there's no ambiguity about
                when it actually runs. */}
            {formatClassWhenLong(danceClass.startTime, danceClass.timezone)}
          </p>
          <p className="text-sm text-ink-soft">
            {formatDuration(danceClass.durationMin)} ·{" "}
            <span className="font-semibold text-ink">
              {formatMoney(danceClass.priceCents, danceClass.currency)}
            </span>
          </p>
        </div>

        <p className="text-sm leading-relaxed text-ink">{danceClass.description}</p>

        <div className="flex items-center gap-3 rounded-2xl bg-surface-muted p-3">
          <Avatar
            emoji={danceClass.host.avatarEmoji}
            color={danceClass.host.avatarColor}
          />
          <div>
            <p className="text-sm font-semibold text-ink">
              {danceClass.studio
                ? danceClass.studio.name
                : publicName(danceClass.host)}
            </p>
            <p className="text-xs text-ink-soft">
              {danceClass.studio
                ? `${danceClass.studio.address}, ${danceClass.studio.city}`
                : `Hosted by ${publicName(danceClass.host)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-ink-soft">
          <span>
            {danceClass.capacity} spots total ·{" "}
            <span className={isFull ? "font-medium text-red-500" : ""}>
              {isFull ? `Full (${seats.waitlisted} waiting)` : `${spotsLeft} left`}
            </span>
          </span>
        </div>

        {isCancelled ? (
          <div className="rounded-full bg-red-50 py-2.5 text-center text-sm font-semibold text-red-600">
            This class was cancelled
          </div>
        ) : isPast ? (
          <div className="rounded-full bg-surface-muted py-2.5 text-center text-sm font-semibold text-ink-soft">
            This class has ended
          </div>
        ) : activeBooking ? (
          <form action={cancelBookingAction.bind(null, activeBooking.id)}>
            <SubmitButton
              variant="secondary"
              className="w-full"
              pendingLabel="Cancelling…"
            >
              {activeBooking.status === "WAITLISTED"
                ? "Leave waitlist"
                : "Cancel booking"}
            </SubmitButton>
          </form>
        ) : (
          <BookButton
            classId={danceClass.id}
            isFull={isFull}
            size="lg"
            label={danceClass.priceCents > 0 ? "Book & pay" : "Book this class"}
          />
        )}
      </Card>
    </div>
  );
}
