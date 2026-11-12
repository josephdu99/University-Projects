import { describe, it, expect } from "vitest";
import { reminderStageFor } from "@/lib/reminder-stage";

const SYD = "Australia/Sydney";

/** A Sydney wall-clock time in November 2026 (AEDT, UTC+11). */
function syd(day: number, hour: number, minute = 0): Date {
  const d = String(day).padStart(2, "0");
  const h = String(hour).padStart(2, "0");
  const m = String(minute).padStart(2, "0");
  return new Date(`2026-11-${d}T${h}:${m}:00+11:00`);
}

describe("reminderStageFor", () => {
  // The daily job fires around 7am Sydney.
  const run = syd(18, 7);

  it("gives a class later today the day-of reminder", () => {
    expect(reminderStageFor(syd(18, 19), SYD, run)).toBe("day-of");
    expect(reminderStageFor(syd(18, 9), SYD, run)).toBe("day-of");
  });

  it("gives a class tomorrow the day-before reminder, whatever the hour", () => {
    // 7:30am tomorrow is 24.5 hours away and 7pm tomorrow is 36: an hour
    // offset rule treats those differently, the calendar does not.
    expect(reminderStageFor(syd(19, 7, 30), SYD, run)).toBe("day-before");
    expect(reminderStageFor(syd(19, 19), SYD, run)).toBe("day-before");
    expect(reminderStageFor(syd(19, 23, 30), SYD, run)).toBe("day-before");
  });

  it("gives nothing yet to a class two or more days out", () => {
    expect(reminderStageFor(syd(20, 0, 30), SYD, run)).toBeNull();
    expect(reminderStageFor(syd(25, 19), SYD, run)).toBeNull();
  });

  it("gives nothing to a class that has already started", () => {
    expect(reminderStageFor(syd(18, 6), SYD, run)).toBeNull();
    expect(reminderStageFor(run, SYD, run)).toBeNull();
  });

  it("never says both for one class on one run", () => {
    // Booked this morning for tonight: the day-of mail only.
    expect(reminderStageFor(syd(18, 20), SYD, run)).toBe("day-of");
  });

  it("walks one class through both reminders on consecutive daily runs", () => {
    const cls = syd(20, 18, 30); // Friday 6:30pm
    expect(reminderStageFor(cls, SYD, syd(18, 7))).toBeNull();
    expect(reminderStageFor(cls, SYD, syd(19, 7))).toBe("day-before");
    expect(reminderStageFor(cls, SYD, syd(20, 7))).toBe("day-of");
    expect(reminderStageFor(cls, SYD, syd(21, 7))).toBeNull();
  });

  it("is not thrown by the run arriving late within its hour", () => {
    // Hobby cron fires any time in the hour. A class tomorrow is still
    // tomorrow at 7:59.
    expect(reminderStageFor(syd(19, 7, 30), SYD, syd(18, 7, 59))).toBe(
      "day-before",
    );
  });

  it("reads the date in the class's own timezone, not the server's", () => {
    // 20:00 UTC on the 17th is 7am on the 18th in Sydney but still the
    // 17th in Los Angeles. A class at 6pm on the 18th, LA time, is
    // therefore tomorrow there, even though the same instant is "today"
    // by the Sydney date.
    const now = new Date("2026-11-17T20:00:00Z");
    const laClass = new Date("2026-11-18T18:00:00-08:00");
    expect(reminderStageFor(laClass, "America/Los_Angeles", now)).toBe(
      "day-before",
    );
    const sydClass = new Date("2026-11-18T18:00:00+11:00");
    expect(reminderStageFor(sydClass, SYD, now)).toBe("day-of");
  });

  it("still means tomorrow on the day the clocks change", () => {
    // Sydney's clocks go back at 3am on Sunday 4 April 2027, making that
    // day 25 hours long. At 12:30am on the 4th, 24 hours later is 11:30pm
    // on the same date, so "now plus a day" would call a class on the 5th
    // two days away. Counting calendar days gets it right.
    const now = new Date("2027-04-04T00:30:00+11:00");
    const nextDay = new Date("2027-04-05T18:00:00+10:00");
    expect(reminderStageFor(nextDay, SYD, now)).toBe("day-before");
  });
});
