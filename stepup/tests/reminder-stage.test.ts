import { describe, it, expect } from "vitest";
import {
  classDayRelativeTo,
  reminderStageFor,
  reminderTargets,
} from "@/lib/reminder-stage";

const SYD = "Australia/Sydney";

/** A Sydney wall-clock time in November 2026 (AEDT, UTC+11). */
function syd(day: number, hour: number, minute = 0): Date {
  const d = String(day).padStart(2, "0");
  const h = String(hour).padStart(2, "0");
  const m = String(minute).padStart(2, "0");
  return new Date(`2026-11-${d}T${h}:${m}:00+11:00`);
}

/** A Friday 7pm class, booked on the Monday. */
const CLASS = syd(20, 19);
const BOOKED_EARLY = syd(16, 12);

function stage(now: Date, bookedAt = BOOKED_EARLY, startTime = CLASS) {
  return reminderStageFor({ startTime, timezone: SYD, bookedAt, now });
}

describe("reminderTargets", () => {
  it("puts the reminders at 6pm the evening before and 9am on the day", () => {
    const t = reminderTargets(CLASS, SYD);
    expect(t.dayBefore).toEqual(syd(19, 18));
    expect(t.dayOf).toEqual(syd(20, 9));
  });

  it("moves the day-of reminder earlier for a class 9am is too late for", () => {
    // A 7am class is reminded at 5am, not two hours after it ended.
    expect(reminderTargets(syd(20, 7), SYD).dayOf).toEqual(syd(20, 5));
    // A 10am class: two hours ahead, 8am, beats 9am.
    expect(reminderTargets(syd(20, 10), SYD).dayOf).toEqual(syd(20, 8));
    // An 11am class is the first that keeps the plain 9am.
    expect(reminderTargets(syd(20, 11), SYD).dayOf).toEqual(syd(20, 9));
  });

  it("uses the class's own timezone for both", () => {
    const perth = new Date("2026-11-20T19:00:00+08:00");
    const t = reminderTargets(perth, "Australia/Perth");
    expect(t.dayBefore).toEqual(new Date("2026-11-19T18:00:00+08:00"));
    expect(t.dayOf).toEqual(new Date("2026-11-20T09:00:00+08:00"));
  });

  it("finds the evening before across a clock change", () => {
    // Sydney's clocks go back on Sunday 4 April 2027, a 25-hour day. The
    // evening before a class on the 5th is still 6pm on the 4th.
    const cls = new Date("2027-04-05T19:00:00+10:00");
    expect(reminderTargets(cls, SYD).dayBefore).toEqual(
      new Date("2027-04-04T18:00:00+10:00"),
    );
  });
});

describe("reminderStageFor, called every hour", () => {
  it("sends nothing before the evening before", () => {
    expect(stage(syd(18, 20))).toBeNull();
    expect(stage(syd(19, 17, 59))).toBeNull();
  });

  it("sends the evening-before reminder from 6pm", () => {
    expect(stage(syd(19, 18))).toBe("day-before");
    expect(stage(syd(19, 18, 5))).toBe("day-before");
  });

  it("does not send the day-of reminder at midnight", () => {
    // The class is 'today' from 12am, but nobody wants mail then. It is
    // still only the evening-before reminder that is due until 9am.
    expect(stage(syd(20, 0, 5))).toBe("day-before");
    expect(stage(syd(20, 8, 59))).toBe("day-before");
  });

  it("sends the day-of reminder from 9am until the class starts", () => {
    expect(stage(syd(20, 9))).toBe("day-of");
    expect(stage(syd(20, 18, 59))).toBe("day-of");
  });

  it("sends nothing once the class has started", () => {
    expect(stage(CLASS)).toBeNull();
    expect(stage(syd(20, 19, 30))).toBeNull();
  });

  it("reminds a dawn class the evening before and two hours ahead", () => {
    const dawn = syd(20, 7);
    expect(stage(syd(19, 18, 5), BOOKED_EARLY, dawn)).toBe("day-before");
    expect(stage(syd(20, 4, 59), BOOKED_EARLY, dawn)).toBe("day-before");
    expect(stage(syd(20, 5, 5), BOOKED_EARLY, dawn)).toBe("day-of");
  });
});

describe("reminderStageFor, for somebody who booked late", () => {
  it("skips the evening-before reminder if they booked after it was due", () => {
    // Booked at 8pm the night before: the confirmation just went out.
    const booked = syd(19, 20);
    expect(stage(syd(19, 20, 5), booked)).toBeNull();
    // They still get the one on the day.
    expect(stage(syd(20, 9, 5), booked)).toBe("day-of");
  });

  it("sends nothing to somebody who booked on the day after 9am", () => {
    const booked = syd(20, 10, 30);
    expect(stage(syd(20, 11, 5), booked)).toBeNull();
    expect(stage(syd(20, 18), booked)).toBeNull();
  });

  it("still reminds somebody who booked that morning before 9am", () => {
    expect(stage(syd(20, 9, 5), syd(20, 8))).toBe("day-of");
  });
});

describe("reminderStageFor, called less often than it should be", () => {
  it("gives an evening class one late reminder from a once-a-day call", () => {
    // A daily call at 7am never lands in the evening. An evening class
    // still gets a reminder on its morning rather than nothing at all.
    expect(stage(syd(19, 7))).toBeNull();
    expect(stage(syd(20, 7))).toBe("day-before");
  });

  it("can miss a dawn class entirely when called once a day", () => {
    // The honest limit: no 7am call falls between 6pm and a 7am class.
    // This is why the scheduler needs to call at least hourly.
    const dawn = syd(20, 7);
    expect(stage(syd(19, 7), BOOKED_EARLY, dawn)).toBeNull();
    expect(stage(syd(20, 7), BOOKED_EARLY, dawn)).toBeNull();
  });

  it("goes straight to the day-of reminder if the evening run was missed", () => {
    // Scheduler down overnight, back at 10am: one mail, the current one.
    expect(stage(syd(20, 10))).toBe("day-of");
  });
});

describe("classDayRelativeTo", () => {
  it("says tomorrow the evening before and today on the day", () => {
    expect(classDayRelativeTo(CLASS, SYD, syd(19, 18, 5))).toBe("tomorrow");
    expect(classDayRelativeTo(CLASS, SYD, syd(20, 9, 5))).toBe("today");
  });

  it("says today for an evening-before reminder that went out late", () => {
    // The once-a-day case above: sent at 7am on the day itself.
    expect(classDayRelativeTo(CLASS, SYD, syd(20, 7))).toBe("today");
  });

  it("goes by the class's timezone, not the server's", () => {
    // 20:00 UTC on the 19th is already the 20th in Sydney.
    const now = new Date("2026-11-19T20:00:00Z");
    expect(classDayRelativeTo(CLASS, SYD, now)).toBe("today");
  });
});
