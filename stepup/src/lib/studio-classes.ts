import type { Prisma } from "@/generated/prisma/client";
import { DAYS } from "@/lib/class-form";
import { sessionStarts } from "@/lib/class-schedule";
import { addDaysToDateString, dayOfWeekInTimeZone, zonedDateTimeToUtc } from "@/lib/time";
import type { StudioClassDraft } from "@/lib/studio-class-form";

type Tx = Prisma.TransactionClient;

/**
 * Write a studio class from the v6.4 form: a one-off, a weekly or fortnightly
 * series for the scheduling horizon, or a course (weekly from its term start,
 * for its number of weeks, sold as one purchase).
 */
export async function createStudioClass(
  tx: Tx,
  d: StudioClassDraft,
  ctx: {
    hostId: string;
    studioId: string;
    teacherMemberId: string;
    timezone: string;
    venue: { id: string | null; location: string; suburb: string | null };
  },
  now = new Date(),
) {
  const title = d.title.trim();
  const listing = d.listing;
  const priceCents = listing === "DROP_IN" ? Number(d.price) * 100 : 0;
  const partner = d.partnerClass;

  const shared = {
    title,
    style: d.style.trim(),
    description:
      d.desc.trim() || `A ${d.style.trim()} class. It assumes nobody in the room has danced before.`,
    format: "IN_PERSON",
    level: d.level,
    location: ctx.venue.location,
    suburb: ctx.venue.suburb,
    venueId: ctx.venue.id,
    timezone: ctx.timezone,
    durationMin: Number(d.dur),
    capacity: Number(d.cap),
    stepupSpots: Number(d.setAside),
    priceCents,
    currency: "aud",
    listing,
    music: d.music,
    partner: partner ? "ROTATE" : "SOLO",
    partnerRule: partner ? d.rule : null,
    leadCap: partner && d.rule === "CAPS" ? Number(d.leadCap) : null,
    followCap: partner && d.rule === "CAPS" ? Number(d.followCap) : null,
    balanceX: partner && d.rule === "BALANCE" ? Number(d.balanceX) : null,
    cancelPolicy: d.policy === "studio" ? null : d.policy,
    kids: d.kids,
    wear: d.wear.trim() || null,
    plan: d.plan.trim() || null,
    hostId: ctx.hostId,
    studioId: ctx.studioId,
    teacherMemberId: ctx.teacherMemberId,
  };

  let starts: Date[];
  if (listing === "COURSE") {
    const weeks = Number(d.weeks);
    starts = Array.from({ length: weeks }, (_, i) =>
      zonedDateTimeToUtc(addDaysToDateString(d.termStart, i * 7), d.time, ctx.timezone),
    );
  } else {
    starts = sessionStarts(now, d.day, d.time, d.repeat, ctx.timezone);
  }

  let seriesId: string | null = null;
  if (listing === "COURSE" || d.repeat !== "once") {
    const series = await tx.classSeries.create({
      data: {
        ...shared,
        dayOfWeek:
          listing === "COURSE"
            ? dayOfWeekInTimeZone(starts[0], ctx.timezone)
            : DAYS.find((x) => x.id === d.day)!.dow,
        localTime: d.time,
        frequency: listing !== "COURSE" && d.repeat === "fortnightly" ? "FORTNIGHTLY" : "WEEKLY",
        startsOn: starts[0],
        endsOn: starts[starts.length - 1],
        courseWeeks: listing === "COURSE" ? Number(d.weeks) : null,
        coursePriceCents: listing === "COURSE" ? Number(d.coursePrice) * 100 : null,
      },
      select: { id: true },
    });
    seriesId = series.id;
  }

  await tx.danceClass.createMany({ data: starts.map((startTime) => ({ ...shared, seriesId, startTime })) });
  const first = await tx.danceClass.findFirstOrThrow({
    where: { hostId: ctx.hostId, title, startTime: starts[0], seriesId },
    orderBy: { createdAt: "desc" },
    select: { id: true, startTime: true },
  });
  return { firstId: first.id, firstStart: first.startTime, sessions: starts.length, title, seriesId };
}
