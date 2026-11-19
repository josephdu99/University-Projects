import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { cancelBookingAction, cancelEnrolmentAction } from "@/lib/actions/class-actions";
import { countSeats, stepupCapacity } from "@/lib/booking";
import { cancellationOutcome, effectivePolicy } from "@/lib/policies";
import { cutoffSentence } from "@/lib/policy-copy";
import { prepayRequired } from "@/lib/cancellation";
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

  const capacity = stepupCapacity(danceClass);
  const spotsLeft = capacity - seats.taken;
  const policy = effectivePolicy(danceClass.cancelPolicy, danceClass.studio?.cancelPolicy);
  const bookable = danceClass.listing !== "HIDDEN" && !danceClass.kids;
  const isFull = spotsLeft <= 0;
  const isPast = danceClass.startTime < new Date();
  const isCancelled = Boolean(danceClass.cancelledAt);
  const activeBooking =
    myBooking && myBooking.status !== "CANCELLED" ? myBooking : null;

  // What cancelling now would give back, so the button can say so.
  const outcome =
    activeBooking && activeBooking.status !== "WAITLISTED"
      ? cancellationOutcome({
          now: new Date(),
          start: danceClass.startTime,
          policy,
          prepayRequired: await prepayRequired(user.id, danceClass.hostId),
          movedSinceBooking: Boolean(danceClass.venueChangedAt && danceClass.venueChangedAt > activeBooking.bookedAt),
        })
      : null;
  const paid = danceClass.priceCents > 0 && activeBooking?.status === "BOOKED";
  const cancelLabel =
    outcome === "FULL"
      ? paid
        ? "Cancel booking · full refund"
        : "Cancel booking"
      : outcome === "CREDIT"
        ? "Cancel booking · get credit, no refund"
        : outcome === "NONE"
          ? "Cancel booking · no refund"
          : "Leave waitlist";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Link href="/discover" className="text-sm font-medium text-ink-soft">
        ← Back to Discover
      </Link>

      {cancelled && (
        <p role="status" className="rounded-2xl bg-surface-muted px-4 py-3 text-sm text-ink-soft">
          {cancelled === "full"
            ? "Booking cancelled. Anything you paid is on its way back to your card."
            : cancelled === "credit"
              ? "Booking cancelled. It was after the free cancellation cut-off, so you have credit at this studio instead of a refund. It's used automatically next time you book here."
              : cancelled === "none"
                ? "Booking cancelled. It was after the free cancellation cut-off, so there's nothing back this time."
                : "Payment cancelled, your spot wasn't reserved."}
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
            {capacity} spots on StepUp ·{" "}
            <span className={isFull ? "font-medium text-red-500" : ""}>
              {isFull ? `Full (${seats.waitlisted} waiting)` : `${spotsLeft} left`}
            </span>
          </span>
        </div>

        <p className="text-sm text-ink-soft">{cutoffSentence(danceClass.startTime, danceClass.timezone, policy)}</p>

        {isCancelled ? (
          <div className="rounded-full bg-red-50 py-2.5 text-center text-sm font-semibold text-red-600">
            This class was cancelled
          </div>
        ) : isPast ? (
          <div className="rounded-full bg-surface-muted py-2.5 text-center text-sm font-semibold text-ink-soft">
            This class has ended
          </div>
        ) : activeBooking?.enrolmentId ? (
          <form action={cancelEnrolmentAction.bind(null, activeBooking.enrolmentId)}>
            <SubmitButton variant="secondary" className="w-full" pendingLabel="Cancelling…">
              Cancel my course enrolment
            </SubmitButton>
          </form>
        ) : activeBooking?.status === "PENDING_PAYMENT" ? (
          <Link
            href={`/first-class/${danceClass.id}/booked`}
            className="rounded-full bg-brand py-3 text-center text-sm font-bold text-white"
          >
            Pay to keep your place
          </Link>
        ) : activeBooking ? (
          <form action={cancelBookingAction.bind(null, activeBooking.id)}>
            <SubmitButton
              variant="secondary"
              className="w-full"
              pendingLabel="Cancelling…"
            >
              {cancelLabel}
            </SubmitButton>
          </form>
        ) : !bookable ? (
          <div className="rounded-full bg-surface-muted py-2.5 text-center text-sm font-semibold text-ink-soft">
            {danceClass.kids ? "Kids' classes are booked by a parent or guardian, which isn't open on StepUp yet." : "This class isn't booked through StepUp."}
          </div>
        ) : (
          <Link
            href={`/first-class/${danceClass.id}/book`}
            className="rounded-full bg-brand py-3 text-center text-sm font-bold text-white"
          >
            {isFull ? "Join the waitlist" : danceClass.listing === "COURSE" ? "Enrol" : danceClass.priceCents > 0 ? "Book & pay" : "Book this class"}
          </Link>
        )}
      </Card>
    </div>
  );
}
