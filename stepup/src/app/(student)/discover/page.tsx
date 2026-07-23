import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { ClassCard, type ClassCardData } from "@/components/classes/ClassCard";
import { PillLink } from "@/components/ui/PillLink";

const FORMAT_FILTERS = [
  { value: "", label: "All classes" },
  { value: "IN_PERSON", label: "In person" },
  { value: "ONLINE", label: "Online" },
];

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string; style?: string }>;
}) {
  const user = await requireRole("STUDENT");
  const { format, style } = await searchParams;

  const [classes, styles, bookings] = await Promise.all([
    db.danceClass.findMany({
      where: {
        startTime: { gte: new Date() },
        ...(format ? { format } : {}),
        ...(style ? { style } : {}),
      },
      orderBy: { startTime: "asc" },
      include: {
        host: { select: { name: true } },
        studio: { select: { name: true, city: true } },
        _count: { select: { bookings: { where: { status: { not: "CANCELLED" } } } } },
      },
    }),
    db.danceClass.findMany({
      where: { startTime: { gte: new Date() } },
      select: { style: true },
      distinct: ["style"],
      orderBy: { style: "asc" },
    }),
    db.booking.findMany({
      where: { userId: user.id, status: { not: "CANCELLED" } },
      select: { classId: true },
    }),
  ]);

  const bookedClassIds = new Set(bookings.map((b) => b.classId));

  const cards: ClassCardData[] = classes.map((c) => ({
    id: c.id,
    title: c.title,
    style: c.style,
    format: c.format,
    level: c.level,
    startTime: c.startTime,
    durationMin: c.durationMin,
    points: c.points,
    capacity: c.capacity,
    bookedCount: c._count.bookings,
    hostName: c.host.name,
    studioName: c.studio?.name ?? null,
    city: c.studio?.city ?? null,
  }));

  return (
    <div className="flex flex-col gap-5">
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
            href={{ pathname: "/discover", query: { ...(f.value ? { format: f.value } : {}), ...(style ? { style } : {}) } }}
          >
            {f.label}
          </PillLink>
        ))}
        <span className="mx-1 w-px shrink-0 self-stretch bg-border" />
        <PillLink
          active={!style}
          href={{ pathname: "/discover", query: { ...(format ? { format } : {}) } }}
        >
          All styles
        </PillLink>
        {styles.map((s) => (
          <PillLink
            key={s.style}
            active={style === s.style}
            href={{ pathname: "/discover", query: { ...(format ? { format } : {}), style: s.style } }}
          >
            {s.style}
          </PillLink>
        ))}
      </div>

      {cards.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-6 text-center text-sm text-ink-soft">
          No upcoming classes match those filters yet.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <ClassCard key={c.id} data={c} isBooked={bookedClassIds.has(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
