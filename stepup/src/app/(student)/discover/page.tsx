import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { publicName } from "@/lib/roles";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { dateBlockParts, formatDuration, formatMoney } from "@/lib/time";
import { VerifyBanner } from "@/components/VerifyBanner";
import { DiscoverBrowser } from "@/components/dancer/DiscoverBrowser";
import type { DiscoverClass } from "@/components/dancer/ClassCard";

export const metadata = { title: "Find your next class — StepUp" };

const SEAT_HOLDING = ["BOOKED", "ATTENDED", "PENDING_PAYMENT"];

/** Meter rank: 0 fills all three bars, 1–3 fill that many. */
const LEVEL_RANK: Record<string, number> = {
  ALL_LEVELS: 0,
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
};

const LEVEL_LABEL: Record<string, string> = {
  ALL_LEVELS: "All levels",
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; format?: string; city?: string; style?: string }>;
}) {
  const user = await requireRole("STUDENT");
  const params = await searchParams;

  // Everything upcoming is fetched once; filtering happens in the browser so
  // typing is instant. Sorted soonest first.
  const [classes, myBookings] = await Promise.all([
    db.danceClass.findMany({
      where: { startTime: { gte: new Date() }, cancelledAt: null },
      orderBy: { startTime: "asc" },
      take: 60,
      include: {
        host: { select: { name: true, displayName: true } },
        studio: { select: { name: true, city: true } },
        _count: { select: { bookings: { where: { status: { in: SEAT_HOLDING } } } } },
      },
    }),
    db.booking.findMany({
      where: { userId: user.id, status: { not: "CANCELLED" } },
      select: { classId: true, status: true },
    }),
  ]);

  const statusByClass = new Map(myBookings.map((b) => [b.classId, b.status]));

  const cards: DiscoverClass[] = classes.map((c) => {
    // Times render in the class's own zone, matching the promise /studio makes.
    const { month, day, time } = dateBlockParts(c.startTime, c.timezone);
    const teacher = publicName(c.host);
    const online = c.format === "ONLINE";

    return {
      id: c.id,
      title: c.title,
      style: c.style,
      format: online ? "ONLINE" : "IN_PERSON",
      level: LEVEL_LABEL[c.level] ?? c.level,
      levelRank: LEVEL_RANK[c.level] ?? 0,
      venue: c.studio?.name ?? teacher,
      city: online ? "Live online" : (c.studio?.city ?? "In person"),
      teacher,
      month,
      day,
      time,
      duration: formatDuration(c.durationMin),
      price: c.priceCents === 0 ? "Free" : formatMoney(c.priceCents, c.currency),
      booked: c._count.bookings,
      capacity: c.capacity,
      bookingStatus: statusByClass.get(c.id),
    };
  });

  // Filter options come from what is actually on the platform, never a fixed list.
  const styles = Array.from(new Set(cards.map((c) => c.style))).sort();
  const cities = Array.from(new Set(cards.map((c) => c.city))).sort();

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <VerifyBanner verified={user.verified} />
      </div>

      <header style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: "clamp(30px, 5vw, 40px)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            margin: "0 0 10px",
          }}
        >
          Find your next class
        </h1>
        <p style={{ fontSize: 17, color: "oklch(48% 0.02 60)", margin: 0 }}>
          In person or online, one tap to book your spot.
        </p>
      </header>

      <DiscoverBrowser
        classes={cards}
        styles={styles}
        cities={cities}
        initial={{
          q: params.q ?? "",
          format: params.format === "ONLINE" || params.format === "IN_PERSON" ? params.format : "",
          city: cities.includes(params.city ?? "") ? (params.city as string) : "",
          style: styles.includes(params.style ?? "") ? (params.style as string) : "",
        }}
      />

      <p
        style={{
          marginTop: 28,
          fontSize: 13,
          color: C.label,
          textAlign: "center",
        }}
      >
        Showing the next {cards.length} {cards.length === 1 ? "class" : "classes"}.
      </p>
    </>
  );
}
