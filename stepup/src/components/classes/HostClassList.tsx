import Link from "next/link";
import { db } from "@/lib/db";
import { formatClassWhen, formatDuration } from "@/lib/format";
import { Tag } from "@/components/ui/Pill";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/gamification/StatTile";
import { CreateClassForm } from "@/components/classes/CreateClassForm";

export async function HostClassList({
  hostId,
  basePath,
  fixedFormat,
}: {
  hostId: string;
  basePath: "/studio" | "/teach";
  fixedFormat?: "ONLINE";
}) {
  const classes = await db.danceClass.findMany({
    where: { hostId },
    include: {
      _count: { select: { bookings: { where: { status: { not: "CANCELLED" } } } } },
      bookings: { where: { status: "ATTENDED" }, select: { id: true } },
    },
    orderBy: { startTime: "desc" },
  });

  const now = new Date();
  const upcoming = classes.filter((c) => c.startTime >= now).reverse();
  const past = classes.filter((c) => c.startTime < now);
  const studentsTaught = new Set(
    past.flatMap((c) => c.bookings.map((b) => b.id))
  ).size;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        <StatTile emoji="📅" label="Upcoming" value={upcoming.length} />
        <StatTile emoji="🕺" label="Classes hosted" value={classes.length} />
        <StatTile emoji="✅" label="Check-ins" value={studentsTaught} />
      </div>

      <CreateClassForm fixedFormat={fixedFormat} />

      <div>
        <h2 className="mb-3 text-lg font-bold text-ink">Upcoming classes</h2>
        {upcoming.length === 0 ? (
          <p className="rounded-2xl bg-surface-muted p-5 text-center text-sm text-ink-soft">
            No upcoming classes — create one above.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {upcoming.map((c) => (
              <ClassRow key={c.id} c={c} basePath={basePath} />
            ))}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-bold text-ink">Past classes</h2>
          <div className="flex flex-col gap-2.5">
            {past.slice(0, 10).map((c) => (
              <ClassRow key={c.id} c={c} basePath={basePath} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClassRow({
  c,
  basePath,
}: {
  c: {
    id: string;
    title: string;
    style: string;
    format: string;
    startTime: Date;
    durationMin: number;
    capacity: number;
    _count: { bookings: number };
  };
  basePath: string;
}) {
  return (
    <Link href={`${basePath}/classes/${c.id}`}>
      <Card className="flex items-center justify-between gap-3 p-4 hover:border-ink-soft">
        <div>
          <div className="flex flex-wrap gap-1.5">
            <Tag tone="brand">{c.style}</Tag>
            <Tag tone={c.format === "ONLINE" ? "success" : "neutral"}>
              {c.format === "ONLINE" ? "Online" : "In person"}
            </Tag>
          </div>
          <p className="mt-1 font-semibold text-ink">{c.title}</p>
          <p className="text-sm text-ink-soft">
            {formatClassWhen(c.startTime)} · {formatDuration(c.durationMin)}
          </p>
        </div>
        <span className="text-sm font-semibold text-ink-soft">
          {c._count.bookings}/{c.capacity}
        </span>
      </Card>
    </Link>
  );
}
