import type { Prisma } from "@/generated/prisma/client";
import { findSuburb } from "@/lib/suburbs";
import { sessionStarts } from "@/lib/class-schedule";
import { DAYS, type ClassDraft } from "@/lib/class-form";

type Tx = Prisma.TransactionClient;

export type ClassOwner =
  | {
      kind: "studio";
      hostId: string;
      studioId: string;
      teacherMemberId: string;
      timezone: string;
      /** The studio's street address and city, the venue for every class. */
      location: string;
    }
  | { kind: "independent"; hostId: string; timezone: string };

/**
 * Write a First Timer class: one session for a one-off, or a series and its
 * sessions for the next twelve weeks. The draft has already passed
 * `classProblems`; this only shapes it for the database.
 *
 * Every class made this way is BEGINNER level, which is what puts it in the
 * matcher as a "First Timer" class, and in person.
 */
export async function createFirstTimerClass(
  tx: Tx,
  draft: ClassDraft,
  owner: ClassOwner,
  priceCents: number,
  now = new Date(),
) {
  const suburb = owner.kind === "independent" ? findSuburb(draft.suburb) : null;
  const title = draft.title.trim();
  const plan = draft.plan.trim();

  const shared = {
    title,
    style: draft.style.trim(),
    // The class page leads with the teacher's own note when there is one;
    // this is what shows otherwise, so it says what the promise guarantees.
    description:
      plan ||
      `A First Timer ${draft.style.trim()} class. It assumes nobody in the room has danced before.`,
    format: "IN_PERSON",
    level: "BEGINNER",
    location:
      owner.kind === "studio"
        ? owner.location
        : `${draft.address.trim()}, ${suburb?.name ?? draft.suburb.trim()}`,
    timezone: owner.timezone,
    durationMin: Number(draft.dur),
    capacity: Number(draft.cap),
    priceCents,
    currency: "aud",
    music: draft.music,
    partner: draft.partner,
    firstTimerSpots: Number(draft.newSpots),
    wear: draft.wear.trim() || null,
    plan: plan || null,
    room: draft.room.trim() || null,
    suburb: suburb?.name ?? null,
    arrive: owner.kind === "independent" ? draft.arrive.trim() || null : null,
    hostId: owner.hostId,
    studioId: owner.kind === "studio" ? owner.studioId : null,
    teacherMemberId: owner.kind === "studio" ? owner.teacherMemberId : null,
  };

  const starts = sessionStarts(now, draft.day, draft.time, draft.repeat, owner.timezone);

  let seriesId: string | null = null;
  if (draft.repeat !== "once") {
    const series = await tx.classSeries.create({
      data: {
        ...shared,
        dayOfWeek: DAYS.find((d) => d.id === draft.day)!.dow,
        localTime: draft.time,
        frequency: draft.repeat === "weekly" ? "WEEKLY" : "FORTNIGHTLY",
        startsOn: starts[0],
        endsOn: starts[starts.length - 1],
      },
      select: { id: true },
    });
    seriesId = series.id;
  }

  await tx.danceClass.createMany({
    data: starts.map((startTime) => ({ ...shared, seriesId, startTime })),
  });

  const first = await tx.danceClass.findFirstOrThrow({
    where: { hostId: owner.hostId, title, startTime: starts[0], seriesId },
    orderBy: { createdAt: "desc" },
    select: { id: true, startTime: true },
  });

  return { firstId: first.id, firstStart: first.startTime, sessions: starts.length, title };
}
