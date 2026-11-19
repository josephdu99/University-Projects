import Link from "next/link";
import { db } from "@/lib/db";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { formatClassWhen } from "@/lib/time";
import { TEAM_ROLE_LABEL, type TeamRole } from "@/lib/team";

const SEAT_HOLDING = ["BOOKED", "ATTENDED", "PENDING_PAYMENT"];

/**
 * A teacher's studios: the teams they've joined, and the studio classes
 * they've been put down to teach with how many have booked. Studio classes
 * are the studio's, so they're listed here rather than as the teacher's own.
 */
export async function TeachingTeams({ userId }: { userId: string }) {
  const memberships = await db.studioMember.findMany({
    where: { userId, status: "ACTIVE", studio: { ownerId: { not: userId }, suspendedAt: null } },
    orderBy: { joinedAt: "asc" },
    include: { studio: { select: { name: true, address: true } } },
  });
  if (memberships.length === 0) return null;

  const classes = await db.danceClass.findMany({
    where: {
      teacherMemberId: { in: memberships.map((m) => m.id) },
      startTime: { gte: new Date() },
      cancelledAt: null,
    },
    orderBy: { startTime: "asc" },
    take: 8,
    select: {
      id: true,
      title: true,
      startTime: true,
      timezone: true,
      capacity: true,
      studio: { select: { name: true } },
      _count: { select: { bookings: { where: { status: { in: SEAT_HOLDING } } } } },
    },
  });

  return (
    <section aria-labelledby="your-studios" style={{ marginBottom: 44 }}>
      <h2
        id="your-studios"
        style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: "clamp(22px, 3vw, 26px)", letterSpacing: "-0.02em", margin: "0 0 16px" }}
      >
        Your studios
      </h2>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, overflow: "hidden" }}>
        {memberships.map((m, i) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              padding: "16px clamp(16px, 2.5vw, 26px)",
              borderTop: i ? `1px solid ${C.rowDivider}` : undefined,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16 }}>{m.studio.name}</div>
              <div style={{ fontSize: 13.5, color: "oklch(50% 0.02 60)" }}>
                {TEAM_ROLE_LABEL[m.role as TeamRole] ?? "Teacher"} · {m.studio.address} · Payments through the studio
              </div>
            </div>
            {m.role === "MANAGER" && (
              <Link
                href="/studio"
                className="stepup-ghost-pill"
                style={{ fontSize: 13.5, fontWeight: 600, padding: "9px 16px", borderRadius: 999, border: "1px solid oklch(89% 0.012 70)", color: "oklch(38% 0.02 60)", textDecoration: "none" }}
              >
                Open studio dashboard
              </Link>
            )}
          </div>
        ))}
        <div style={{ padding: "14px clamp(16px, 2.5vw, 26px)", borderTop: `1px solid ${C.rowDivider}`, background: C.tinted }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: C.label, marginBottom: 8 }}>
            CLASSES YOU&apos;RE TEACHING
          </div>
          {classes.length === 0 ? (
            <div style={{ fontSize: 14, color: C.inkSoft }}>
              Nothing yet. Your studio puts you down as the teacher when it creates a class.
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {classes.map((c) => (
                <li key={c.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 14.5 }}>
                  <span>
                    <Link href={`/first-class/${c.id}`} style={{ color: C.ink, fontWeight: 700 }}>
                      {c.title}
                    </Link>{" "}
                    · {c.studio?.name} · {formatClassWhen(c.startTime, c.timezone)}
                  </span>
                  <span style={{ color: C.inkSoft }}>
                    {c._count.bookings} of {c.capacity} booked
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
