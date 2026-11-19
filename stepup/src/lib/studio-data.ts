import { db } from "@/lib/db";
import { roleLimitsOf, stepupCapacity, SEAT_HOLDING } from "@/lib/booking";
import { roleSummary } from "@/lib/partner-roles";
import { NO_SHOW_WINDOW_DAYS, studentStatus } from "@/lib/policies";
import { dateKeyInTimeZone, dayOfWeekInTimeZone, addDaysToDateString, zonedDateTimeToUtc } from "@/lib/time";
import type { StatementEntry } from "@/lib/statement";

/**
 * Everything the studio dashboard's tabs read. Studio classes are all hosted
 * by the studio's account, so `hostId` (the account holder) scopes every
 * query: bookings, payments and students belong to the studio, whoever on the
 * team is looking.
 */

export type DashClass = {
  id: string;
  title: string;
  style: string;
  level: string;
  listing: string;
  startTime: Date;
  timezone: string;
  durationMin: number;
  priceCents: number;
  coursePriceCents: number | null;
  courseWeeks: number | null;
  seriesId: string | null;
  repeat: string | null;
  laterSessions: number;
  venueName: string;
  teacherName: string;
  booked: number;
  stepupSpots: number;
  capacity: number;
  roleSummary: string;
  partnerRule: string | null;
  cancelledAt: Date | null;
  kids: boolean;
};

const CLASS_INCLUDE = {
  series: { select: { frequency: true, coursePriceCents: true, courseWeeks: true } },
  venue: { select: { name: true } },
  teacherMember: { select: { name: true } },
  host: { select: { name: true } },
  walkIns: { select: { role: true } },
  bookings: { where: { status: { in: SEAT_HOLDING } }, select: { role: true } },
} as const;

type ClassRow = Awaited<ReturnType<typeof loadClasses>>[number];

function loadClasses(hostId: string, where: object, take: number, order: "asc" | "desc") {
  return db.danceClass.findMany({
    where: { hostId, ...where },
    include: CLASS_INCLUDE,
    orderBy: { startTime: order },
    take,
  });
}

function shapeClass(c: ClassRow, studioName: string): DashClass {
  const limits = roleLimitsOf(c);
  return {
    id: c.id,
    title: c.title,
    style: c.style,
    level: c.level,
    listing: c.listing,
    startTime: c.startTime,
    timezone: c.timezone,
    durationMin: c.durationMin,
    priceCents: c.priceCents,
    coursePriceCents: c.series?.coursePriceCents ?? null,
    courseWeeks: c.series?.courseWeeks ?? null,
    seriesId: c.seriesId,
    repeat: c.series ? (c.series.frequency === "FORTNIGHTLY" ? "Fortnightly" : "Weekly") : null,
    laterSessions: 0,
    venueName: c.venue?.name ?? studioName,
    teacherName: c.teacherMember?.name ?? c.host.name,
    booked: c.bookings.length,
    stepupSpots: stepupCapacity(c),
    capacity: c.capacity,
    roleSummary: limits ? roleSummary(limits, [...c.bookings.map((b) => b.role), ...c.walkIns.map((w) => w.role)]) : "",
    partnerRule: c.partnerRule,
    cancelledAt: c.cancelledAt,
    kids: c.kids,
  };
}

/** Upcoming classes, one row per repeating class (its next date). */
export async function upcomingClasses(hostId: string, studioName: string): Promise<DashClass[]> {
  const rows = await loadClasses(hostId, { startTime: { gte: new Date() }, cancelledAt: null }, 300, "asc");
  const out: DashClass[] = [];
  const bySeries = new Map<string, DashClass>();
  for (const r of rows) {
    if (r.seriesId && bySeries.has(r.seriesId)) {
      bySeries.get(r.seriesId)!.laterSessions++;
      continue;
    }
    const shaped = shapeClass(r, studioName);
    if (r.seriesId) bySeries.set(r.seriesId, shaped);
    out.push(shaped);
  }
  return out;
}

export async function pastClasses(hostId: string, studioName: string, take = 6): Promise<DashClass[]> {
  const rows = await loadClasses(hostId, { startTime: { lt: new Date() } }, take, "desc");
  return rows.map((r) => shapeClass(r, studioName));
}

export async function dashboardCounts(hostId: string) {
  const [hosted, checkIns] = await Promise.all([
    db.danceClass.count({ where: { hostId, startTime: { lt: new Date() }, cancelledAt: null } }),
    db.booking.count({ where: { class: { hostId }, status: "ATTENDED" } }),
  ]);
  return { hosted, checkIns };
}

// ─── One class's sheet ───────────────────────────────────────────────────────

export async function classSheet(classId: string, hostId: string) {
  const c = await db.danceClass.findFirst({
    where: { id: classId, hostId },
    include: {
      venue: true,
      teacherMember: { select: { name: true, userId: true } },
      studio: { select: { id: true, name: true, address: true, city: true } },
      host: { select: { name: true } },
      walkIns: { orderBy: { createdAt: "asc" } },
      messages: { orderBy: { createdAt: "desc" }, include: { sender: { select: { name: true } } } },
      bookings: {
        where: { status: { in: [...SEAT_HOLDING, "NO_SHOW", "WAITLISTED"] } },
        orderBy: [{ waitlistPosition: "asc" }, { bookedAt: "asc" }],
        include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      },
    },
  });
  if (!c) return null;

  // "1st class" means first time at this studio: no attended class with this
  // host before this one.
  const userIds = c.bookings.map((b) => b.userId);
  const before = userIds.length
    ? await db.booking.findMany({
        where: {
          userId: { in: userIds },
          status: "ATTENDED",
          class: { hostId, startTime: { lt: c.startTime } },
        },
        distinct: ["userId"],
        select: { userId: true },
      })
    : [];
  const regulars = new Set(before.map((b) => b.userId));
  const holding = c.bookings.filter((b) => b.status !== "WAITLISTED");
  const waiting = c.bookings.filter((b) => b.status === "WAITLISTED");
  const limits = roleLimitsOf(c);

  const others = await db.danceClass.findMany({
    where: {
      hostId,
      id: { not: c.id },
      startTime: { gte: new Date() },
      cancelledAt: null,
      listing: { notIn: ["HIDDEN", "COURSE"] },
    },
    orderBy: { startTime: "asc" },
    take: 4,
    select: { title: true, startTime: true, timezone: true },
  });

  return {
    id: c.id,
    title: c.title,
    style: c.style,
    startTime: c.startTime,
    timezone: c.timezone,
    seriesId: c.seriesId,
    cancelledAt: c.cancelledAt,
    venueId: c.venueId,
    venueName: c.venue?.name ?? c.studio?.name ?? c.host.name,
    address: c.location ?? "",
    teacherName: c.teacherMember?.name ?? c.host.name,
    teacherUserId: c.teacherMember?.userId ?? null,
    partnerRule: c.partnerRule,
    ruleLabel: limits
      ? limits.rule === "CAPS"
        ? `Separate caps: ${c.leadCap} leads, ${c.followCap} follows.`
        : limits.rule === "BALANCE"
          ? `Balanced within ${c.balanceX}. When one side books, the first person waiting on the other side is offered the place automatically.`
          : "No role limits."
      : "",
    roleSummary: limits
      ? roleSummary(limits, [...holding.filter((b) => b.status !== "NO_SHOW").map((b) => b.role), ...c.walkIns.map((w) => w.role)])
      : "",
    roster: holding.map((b) => ({
      bookingId: b.id,
      name: b.user.name,
      email: b.user.email,
      phone: b.user.phone,
      first: !regulars.has(b.userId),
      role: b.role,
      note: b.note,
      status: b.status as "BOOKED" | "ATTENDED" | "NO_SHOW" | "PENDING_PAYMENT",
    })),
    walkIns: c.walkIns.map((w) => ({ id: w.id, name: w.name, role: w.role })),
    waitLeads: waiting.filter((b) => b.role === "LEAD").map((b) => b.user.name),
    waitFollows: waiting.filter((b) => b.role === "FOLLOW").map((b) => b.user.name),
    waitOthers: waiting.filter((b) => b.role !== "LEAD" && b.role !== "FOLLOW").map((b) => b.user.name),
    messages: c.messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      recipients: m.recipients,
      channels: m.channels,
      sender: m.sender?.name ?? "StepUp",
    })),
    recovery: others,
    dow: dayOfWeekInTimeZone(c.startTime, c.timezone),
  };
}

export type ClassSheetData = NonNullable<Awaited<ReturnType<typeof classSheet>>>;

// ─── Students (the Dancers tab) ──────────────────────────────────────────────

export async function studioStudents(hostId: string) {
  const since = new Date(Date.now() - NO_SHOW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db.booking.findMany({
    where: { class: { hostId }, status: { in: ["BOOKED", "ATTENDED", "NO_SHOW", "PENDING_PAYMENT"] } },
    select: {
      status: true,
      noShowAt: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
      class: { select: { startTime: true, timezone: true } },
    },
    orderBy: { class: { startTime: "asc" } },
  });
  const byUser = new Map<
    string,
    { id: string; name: string; email: string; phone: string | null; firstClass: Date; classes: number; noShows: number; upcoming: boolean }
  >();
  const now = Date.now();
  for (const r of rows) {
    const u =
      byUser.get(r.user.id) ??
      { ...r.user, firstClass: r.class.startTime, classes: 0, noShows: 0, upcoming: false };
    if (r.status === "ATTENDED") u.classes++;
    if (r.status === "NO_SHOW" && r.noShowAt && r.noShowAt >= since) u.noShows++;
    if (r.class.startTime.getTime() > now) u.upcoming = true;
    byUser.set(r.user.id, u);
  }
  return [...byUser.values()].map((u) => ({ ...u, status: studentStatus(u.classes, u.noShows) }));
}

/**
 * "This term": since the studio's latest course started, if it runs courses,
 * otherwise the last 12 weeks (or since it joined, if that's sooner).
 */
export async function termWindow(studioId: string, joinedAt: Date) {
  const course = await db.classSeries.findFirst({
    where: { studioId, listing: "COURSE", startsOn: { lte: new Date() } },
    orderBy: { startsOn: "desc" },
    select: { startsOn: true },
  });
  const twelveWeeks = new Date(Date.now() - 84 * 24 * 60 * 60 * 1000);
  if (course && course.startsOn > twelveWeeks) return { start: course.startsOn, label: "since your term started on" };
  if (joinedAt > twelveWeeks) return { start: joinedAt, label: "since you joined StepUp on" };
  return { start: twelveWeeks, label: "in the 12 weeks since" };
}

/**
 * New students StepUp brought this term, and what their bookings were
 * worth: people whose first booking with the studio fell in the window, and
 * the payments for everything they've booked since.
 */
export async function newStudentValue(hostId: string, since: Date) {
  const firsts = await db.booking.groupBy({
    by: ["userId"],
    where: { class: { hostId }, status: { not: "CANCELLED" } },
    _min: { bookedAt: true },
  });
  const newIds = firsts.filter((f) => f._min.bookedAt && f._min.bookedAt >= since).map((f) => f.userId);
  if (newIds.length === 0) return { count: 0, cents: 0 };
  const paid = await db.payment.aggregate({
    where: { status: "PAID", booking: { userId: { in: newIds }, class: { hostId }, bookedAt: { gte: since } } },
    _sum: { amountCents: true },
  });
  return { count: newIds.length, cents: paid._sum.amountCents ?? 0 };
}

// ─── Payouts ─────────────────────────────────────────────────────────────────

const PAYOUT_DOW: Record<string, number> = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5 };
export const PAYOUT_DAYS = ["MON", "TUE", "WED", "THU", "FRI"] as const;
export const PAYOUT_DAY_LABEL: Record<string, string> = { MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri" };

/** The next payout date, and the one before it, as Sydney dates. */
export function payoutDates(day: string, now = new Date(), tz = "Australia/Sydney") {
  const target = PAYOUT_DOW[day] ?? 4;
  const today = dateKeyInTimeZone(now, tz);
  const add = (target - dayOfWeekInTimeZone(now, tz) + 7) % 7 || 7;
  const next = addDaysToDateString(today, add);
  const last = addDaysToDateString(next, -7);
  return { next: zonedDateTimeToUtc(next, "00:00", tz), last: zonedDateTimeToUtc(last, "00:00", tz) };
}

/** What has been paid to the studio since its last payout day, after StepUp's fee. */
export async function paidSince(hostId: string, since: Date) {
  const rows = await db.payment.findMany({
    where: { status: "PAID", paidAt: { gte: since }, booking: { class: { hostId } } },
    select: { amountCents: true, feeCents: true },
  });
  return rows.reduce((s, r) => s + r.amountCents - r.feeCents, 0);
}

/** Statement entries for a month (Sydney time), sales and refunds. */
export async function statementEntries(hostId: string, from: Date, to: Date): Promise<StatementEntry[]> {
  const select = {
    amountCents: true,
    feeCents: true,
    saleType: true,
    paidAt: true,
    refundedAt: true,
    status: true,
    booking: { select: { user: { select: { name: true } }, class: { select: { title: true } } } },
  } as const;
  const [sales, refunds] = await Promise.all([
    db.payment.findMany({
      where: { paidAt: { gte: from, lt: to }, status: { in: ["PAID", "REFUNDED"] }, booking: { class: { hostId } } },
      select,
    }),
    db.payment.findMany({
      where: { refundedAt: { gte: from, lt: to }, status: "REFUNDED", booking: { class: { hostId } } },
      select,
    }),
  ]);
  return [
    ...sales.map((p) => ({
      date: p.paidAt!,
      classTitle: p.booking.class.title,
      student: p.booking.user.name,
      type: (p.saleType === "SELLER" ? "SELLER" : "AGENT") as "AGENT" | "SELLER",
      amountCents: p.amountCents,
      feeCents: p.feeCents,
    })),
    ...refunds.map((p) => ({
      date: p.refundedAt!,
      classTitle: p.booking.class.title,
      student: `${p.booking.user.name} (refund)`,
      type: "REFUND" as const,
      amountCents: -p.amountCents,
      // The platform fee comes back with a refund (refund_application_fee).
      feeCents: -p.feeCents,
    })),
  ];
}

// ─── Teacher pay report ──────────────────────────────────────────────────────

export async function teacherPayReport(hostId: string, from: Date, to: Date) {
  const classes = await db.danceClass.findMany({
    where: { hostId, startTime: { gte: from, lt: to, lte: new Date() }, cancelledAt: null },
    orderBy: { startTime: "asc" },
    select: {
      id: true,
      title: true,
      startTime: true,
      timezone: true,
      teacherMember: { select: { name: true } },
      host: { select: { name: true } },
      bookings: { where: { status: { in: ["BOOKED", "ATTENDED", "NO_SHOW"] } }, select: { status: true } },
    },
  });
  return classes.map((c) => ({
    id: c.id,
    teacher: c.teacherMember?.name ?? c.host.name,
    title: c.title,
    startTime: c.startTime,
    timezone: c.timezone,
    booked: c.bookings.length,
    attended: c.bookings.filter((b) => b.status === "ATTENDED").length,
  }));
}
