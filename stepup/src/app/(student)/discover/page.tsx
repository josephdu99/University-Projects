import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { ClassCard, type ClassCardData } from "@/components/classes/ClassCard";
import { PillLink } from "@/components/ui/PillLink";
import { VerifyBanner } from "@/components/VerifyBanner";

const FORMAT_FILTERS = [
  { value: "", label: "All classes" },
  { value: "IN_PERSON", label: "In person" },
  { value: "ONLINE", label: "Online" },
];

const SEAT_HOLDING = ["BOOKED", "ATTENDED", "PENDING_PAYMENT"];

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string; style?: string; city?: string }>;
}) {
  const user = await requireRole("STUDENT");
  const { format, style, city } = await searchParams;

  const [classes, styles, cities, myBookings] = await Promise.all([
    db.danceClass.findMany({
      where: {
        startTime: { gte: new Date() },
        cancelledAt: null,
        ...(format ? { format } : {}),
        ...(style ? { style } : {}),
        ...(city ? { studio: { city } } : {}),
      },
      orderBy: { startTime: "asc" },
      take: 60,
      include: {
        host: { select: { name: true } },
        studio: { select: { name: true, city: true } },
        _count: { select: { bookings: { where: { status: { in: SEAT_HOLDING } } } } },
      },
    }),
    db.danceClass.findMany({
      where: { startTime: { gte: new Date() }, cancelledAt: null },
      select: { style: true },
      distinct: ["style"],
      orderBy: { style: "asc" },
    }),
    db.studio.findMany({
      select: { city: true },
      distinct: ["city"],
      orderBy: { city: "asc" },
    }),
    db.booking.findMany({
      where: { userId: user.id, status: { not: "CANCELLED" } },
      select: { classId: true, status: true },
    }),
  ]);

  const statusByClass = new Map(myBookings.map((b) => [b.classId, b.status]));

  const cards: ClassCardData[] = classes.map((c) => ({
    id: c.id,
    title: c.title,
    style: c.style,
    format: c.format,
    level: c.level,
    startTime: c.startTime,
    timezone: c.timezone,
    durationMin: c.durationMin,
    points: c.points,
    capacity: c.capacity,
    seatsTaken: c._count.bookings,
    priceCents: c.priceCents,
    currency: c.currency,
    hostName: c.host.name,
    studioName: c.studio?.name ?? null,
    city: c.studio?.city ?? null,
  }));

  const query = (overrides: Record<string, string | undefined>) => {
    const merged = { format, style, city, ...overrides };
    return Object.fromEntries(
      Object.entries(merged).filter(([, v]) => Boolean(v))
    ) as Record<string, string>;
  };

  return (
    <div className="flex flex-col gap-5">
      <VerifyBanner verified={user.verified} />

      <div>
        <h1 className="text-2xl font-extrabold text-ink">Discover classes</h1>
        <p className="text-sm text-ink-soft">
          Book in one tap — in person or online.
        </p>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {FORMAT_FILTERS.map((f) => (
          <PillLink
            key={f.value}
            active={(format ?? "") === f.value}
            href={{ pathname: "/discover", query: query({ format: f.value || undefined }) }}
          >
            {f.label}
          </PillLink>
        ))}

        <span className="mx-1 w-px shrink-0 self-stretch bg-border" />

        <PillLink
          active={!style}
          href={{ pathname: "/discover", query: query({ style: undefined }) }}
        >
          All styles
        </PillLink>
        {styles.map((s) => (
          <PillLink
            key={s.style}
            active={style === s.style}
            href={{ pathname: "/discover", query: query({ style: s.style }) }}
          >
            {s.style}
          </PillLink>
        ))}

        {cities.length > 1 && (
          <>
            <span className="mx-1 w-px shrink-0 self-stretch bg-border" />
            <PillLink
              active={!city}
              href={{ pathname: "/discover", query: query({ city: undefined }) }}
            >
              All cities
            </PillLink>
            {cities.map((c) => (
              <PillLink
                key={c.city}
                active={city === c.city}
                href={{ pathname: "/discover", query: query({ city: c.city }) }}
              >
                {c.city}
              </PillLink>
            ))}
          </>
        )}
      </div>

      {cards.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-6 text-center text-sm text-ink-soft">
          No upcoming classes match those filters yet.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <ClassCard
              key={c.id}
              data={c}
              bookingStatus={statusByClass.get(c.id)}
              viewerTimezone={user.timezone}
            />
          ))}
        </div>
      )}
    </div>
  );
}
