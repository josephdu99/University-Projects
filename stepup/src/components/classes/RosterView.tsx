import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { checkInStudentAction } from "@/lib/actions/class-actions";
import { formatClassWhen, formatDuration } from "@/lib/format";
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
        include: { user: { select: { id: true, name: true, avatarEmoji: true, avatarColor: true } } },
        orderBy: { bookedAt: "asc" },
      },
    },
  });

  if (!danceClass || danceClass.hostId !== hostId) notFound();

  const attendedCount = danceClass.bookings.filter((b) => b.status === "ATTENDED").length;

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
        </div>
        <h1 className="text-xl font-extrabold text-ink">{danceClass.title}</h1>
        <p className="text-sm text-ink-soft">
          {formatClassWhen(danceClass.startTime)} · {formatDuration(danceClass.durationMin)}
        </p>
        <p className="text-sm font-semibold text-ink-soft">
          {attendedCount} checked in · {danceClass.bookings.length}/{danceClass.capacity} booked
        </p>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-bold text-ink">Roster</h2>
        {danceClass.bookings.length === 0 ? (
          <p className="rounded-2xl bg-surface-muted p-5 text-center text-sm text-ink-soft">
            No bookings yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {danceClass.bookings.map((b) => (
              <Card key={b.id} className="flex items-center gap-3 p-3.5">
                <Avatar emoji={b.user.avatarEmoji} color={b.user.avatarColor} size="sm" />
                <span className="flex-1 text-sm font-semibold text-ink">{b.user.name}</span>
                {b.status === "ATTENDED" ? (
                  <Tag tone="success">Attended ✓</Tag>
                ) : (
                  <form action={checkInStudentAction.bind(null, b.id)}>
                    <SubmitButton variant="secondary" size="sm" pendingLabel="Checking in…">
                      Check in
                    </SubmitButton>
                  </form>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
