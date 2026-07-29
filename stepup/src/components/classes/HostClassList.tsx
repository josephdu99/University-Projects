import Link from "next/link";
import { db } from "@/lib/db";
import { formatClassWhen, formatDuration, formatMoney } from "@/lib/time";
import { Tag } from "@/components/ui/Pill";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/gamification/StatTile";
import { CreateClassForm } from "@/components/classes/CreateClassForm";
import { PayoutPanel } from "@/components/PayoutPanel";

const SEAT_HOLDING = ["BOOKED", "ATTENDED", "PENDING_PAYMENT"];

export async function HostClassList({
  hostId,
  basePath,
  fixedFormat,
  timezone,
  canCharge,
}: {
  hostId: string;
  basePath: "/studio" | "/teach";
  fixedFormat?: "ONLINE";
  timezone: string;
  canCharge: boolean;
}) {
  const [classes, payout, earnings] = await Promise.all([
    db.danceClass.findMany({
      where: { hostId },
      include: {
        _count: { select: { bookings: { where: { status: { in: SEAT_HOLDING } } } } },
      },
      orderBy: { startTime: "desc" },
      take: 100,
    }),
    db.payoutAccount.findUnique({ where: { userId: hostId } }),
    db.payment.aggregate({
      where: { status: "PAID", booking: { class: { hostId } } },
      _sum: { amountCents: true, feeCents: true },
    }),
  ]);

  const attendedCount = await db.booking.count({
    where: { class: { hostId }, status: "ATTENDED" },
  });

  const now = new Date();
  const upcoming = classes
    .filter((c) => c.startTime >= now && !c.cancelledAt)
    .reverse();
  const past = classes.filter((c) => c.startTime < now || c.cancelledAt);

  const gross = earnings._sum.amountCents ?? 0;
  const fees = earnings._sum.feeCents ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        <StatTile emoji="📅" label="Upcoming" value={upcoming.length} />
        <StatTile emoji="🕺" label="Classes hosted" value={classes.length} />
        <StatTile emoji="✅" label="Check-ins" value={attendedCount} />
      </div>

      <PayoutPanel
        status={payout?.status ?? null}
        chargesEnabled={payout?.chargesEnabled ?? false}
        payoutsEnabled={payout?.payoutsEnabled ?? false}
        netEarningsCents={gross - fees}
      />

      <CreateClassForm
        fixedFormat={fixedFormat}
        timezone={timezone}
        canCharge={canCharge}
      />

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
            {past.slice(0, 12).map((c) => (
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
    timezone: string;
    durationMin: number;
    capacity: number;
    priceCents: number;
    currency: string;
    cancelledAt: Date | null;
    seriesId: string | null;
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
            {c.seriesId && <Tag>Weekly</Tag>}
            {c.cancelledAt && <Tag tone="neutral">Cancelled</Tag>}
          </div>
          <p className="mt-1 font-semibold text-ink">{c.title}</p>
          <p className="text-sm text-ink-soft">
            {/* Host times are shown in the class's own zone. */}
            {formatClassWhen(c.startTime, c.timezone)} ·{" "}
            {formatDuration(c.durationMin)} ·{" "}
            {formatMoney(c.priceCents, c.currency)}
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-ink-soft">
          {c._count.bookings}/{c.capacity}
        </span>
      </Card>
    </Link>
  );
}
