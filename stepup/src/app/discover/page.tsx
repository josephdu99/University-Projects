import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { publicName } from "@/lib/roles";
import { dateBlockParts, formatDuration, formatMoney } from "@/lib/time";
import { DiscoverBrowser, type DiscoverClass } from "@/components/dancer/DiscoverBrowser";

export const metadata = { title: "Discover · StepUp" };

/** Bookings that hold a seat, so "spots left" reflects reality. */
const SEAT_HOLDING = ["BOOKED", "ATTENDED", "PENDING_PAYMENT"];

const ONLINE = "Live online";

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string; style?: string; city?: string; q?: string }>;
}) {
  const user = await requireRole("STUDENT");
  const params = await searchParams;

  // Everything is fetched once and filtered on the client: the facet counts
  // have to be computed across the whole set anyway, and it makes switching a
  // filter instant rather than a round trip.
  const [classes, myBookings] = await Promise.all([
    db.danceClass.findMany({
      where: { startTime: { gte: new Date() }, cancelledAt: null },
      orderBy: { startTime: "asc" },
      take: 120,
      include: {
        host: { select: { name: true, displayName: true } },
        studio: { select: { name: true, city: true } },
        _count: {
          select: { bookings: { where: { status: { in: SEAT_HOLDING } } } },
        },
      },
    }),
    db.booking.findMany({
      where: { userId: user.id, status: { not: "CANCELLED" } },
      select: { classId: true, status: true },
    }),
  ]);

  const statusByClass = new Map(myBookings.map((b) => [b.classId, b.status]));

  const items: DiscoverClass[] = classes.map((c) => {
    // Times are rendered in the viewer's own zone, not the class's and not
    // the server's.
    const when = dateBlockParts(c.startTime, user.timezone);
    const online = c.format === "ONLINE";
    return {
      id: c.id,
      title: c.title,
      style: c.style,
      format: online ? "Online" : "In person",
      level: c.level,
      city: online ? ONLINE : (c.studio?.city ?? ONLINE),
      venue: c.studio?.name ?? publicName(c.host),
      teacher: publicName(c.host),
      month: when.month,
      day: when.day,
      time: `${dayLabel(c.startTime, user.timezone)} ${when.time}`,
      length: formatDuration(c.durationMin),
      price: formatMoney(c.priceCents, c.currency),
      booked: c._count.bookings,
      capacity: c.capacity,
      bookingStatus: statusByClass.get(c.id) ?? null,
    };
  });

  const styles = [...new Set(items.map((c) => c.style))].sort((a, b) =>
    a.localeCompare(b)
  );
  const cities = [...new Set(items.map((c) => c.city))].sort((a, b) =>
    a.localeCompare(b)
  );

  return (
    <DiscoverBrowser
      classes={items}
      styles={styles}
      cities={cities}
      initial={{
        format: params.format ?? "All",
        style: params.style ?? "All",
        city: params.city ?? "All",
        q: params.q ?? "",
      }}
    />
  );
}

function dayLabel(instant: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    timeZone: timezone,
  }).format(instant);
}
