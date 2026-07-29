import { describe, it, expect } from "vitest";
import {
  zonedDateTimeToUtc,
  hourInTimeZone,
  dayOfWeekInTimeZone,
  addDaysToDateString,
  isoWeeksBetween,
  isoWeekKeyInTimeZone,
  formatClassWhen,
  formatMoney,
  formatDuration,
  isValidTimeZone,
} from "@/lib/time";

const SYD = "Australia/Sydney";
const PER = "Australia/Perth";

describe("zonedDateTimeToUtc", () => {
  it("interprets wall-clock time in the given zone, not the server's", () => {
    // The original bug: 6pm Sydney was being stored as 6pm UTC, shifting every
    // class by 10-11 hours.
    const utc = zonedDateTimeToUtc("2026-07-26", "18:00", SYD);
    expect(utc.toISOString()).toBe("2026-07-26T08:00:00.000Z");
  });

  it("accounts for daylight saving", () => {
    // Sydney is UTC+10 in July (AEST) but UTC+11 in January (AEDT).
    expect(zonedDateTimeToUtc("2026-07-26", "18:00", SYD).toISOString()).toBe(
      "2026-07-26T08:00:00.000Z"
    );
    expect(zonedDateTimeToUtc("2026-01-15", "18:00", SYD).toISOString()).toBe(
      "2026-01-15T07:00:00.000Z"
    );
  });

  it("handles zones without daylight saving", () => {
    expect(zonedDateTimeToUtc("2026-07-26", "18:00", PER).toISOString()).toBe(
      "2026-07-26T10:00:00.000Z"
    );
    expect(zonedDateTimeToUtc("2026-01-15", "18:00", PER).toISOString()).toBe(
      "2026-01-15T10:00:00.000Z"
    );
  });

  it("round-trips back to the same local hour", () => {
    for (const time of ["00:00", "07:30", "12:00", "18:00", "23:45"]) {
      const utc = zonedDateTimeToUtc("2026-07-26", time, SYD);
      const hour = Number(time.split(":")[0]);
      expect(hourInTimeZone(utc, SYD)).toBe(hour);
    }
  });
});

describe("hourInTimeZone", () => {
  it("reports the local hour, which drives the time-of-day badges", () => {
    const earlyClass = zonedDateTimeToUtc("2026-07-26", "07:00", SYD);
    // In UTC this instant is 21:00 — the old code read that and wrongly
    // awarded Night Owl for a 7am class.
    expect(earlyClass.getUTCHours()).toBe(21);
    expect(hourInTimeZone(earlyClass, SYD)).toBe(7);
    expect(hourInTimeZone(earlyClass, SYD) < 8).toBe(true);
  });

  it("identifies a genuine night class", () => {
    const lateClass = zonedDateTimeToUtc("2026-07-26", "21:00", SYD);
    expect(hourInTimeZone(lateClass, SYD)).toBe(21);
    expect(hourInTimeZone(lateClass, SYD) >= 20).toBe(true);
  });
});

describe("dayOfWeekInTimeZone", () => {
  it("uses local days, not UTC days", () => {
    // Monday 8am Sydney is still Sunday in UTC.
    const mondayMorning = zonedDateTimeToUtc("2026-07-27", "08:00", SYD);
    expect(mondayMorning.getUTCDay()).toBe(0); // Sunday in UTC
    expect(dayOfWeekInTimeZone(mondayMorning, SYD)).toBe(1); // Monday locally
  });
});

describe("addDaysToDateString", () => {
  it("adds days without timezone drift", () => {
    expect(addDaysToDateString("2026-07-26", 7)).toBe("2026-08-02");
    expect(addDaysToDateString("2026-12-28", 7)).toBe("2027-01-04");
    expect(addDaysToDateString("2026-02-25", 7)).toBe("2026-03-04");
  });

  it("survives a daylight-saving boundary", () => {
    // Sydney DST ends on 5 April 2026; stepping across it must not lose a day.
    expect(addDaysToDateString("2026-04-01", 7)).toBe("2026-04-08");
  });

  it("keeps a weekly series on the same weekday across DST", () => {
    const start = "2026-04-01";
    const next = addDaysToDateString(start, 7);
    const a = zonedDateTimeToUtc(start, "19:00", SYD);
    const b = zonedDateTimeToUtc(next, "19:00", SYD);

    // Same local weekday and hour on both sides of the transition...
    expect(dayOfWeekInTimeZone(a, SYD)).toBe(dayOfWeekInTimeZone(b, SYD));
    expect(hourInTimeZone(a, SYD)).toBe(19);
    expect(hourInTimeZone(b, SYD)).toBe(19);

    // ...even though the UTC gap is 8 days' worth of hours, not 7.
    const hoursApart = (b.getTime() - a.getTime()) / 3_600_000;
    expect(hoursApart).toBe(169);
  });
});

describe("isoWeeksBetween", () => {
  it("counts whole weeks for streak logic", () => {
    const w0 = zonedDateTimeToUtc("2026-07-20", "18:00", SYD);
    expect(isoWeeksBetween(w0, zonedDateTimeToUtc("2026-07-21", "18:00", SYD), SYD)).toBe(0);
    expect(isoWeeksBetween(w0, zonedDateTimeToUtc("2026-07-27", "18:00", SYD), SYD)).toBe(1);
    expect(isoWeeksBetween(w0, zonedDateTimeToUtc("2026-08-10", "18:00", SYD), SYD)).toBe(3);
  });

  it("handles the new-year boundary", () => {
    const dec = zonedDateTimeToUtc("2025-12-29", "18:00", SYD);
    const jan = zonedDateTimeToUtc("2026-01-05", "18:00", SYD);
    expect(isoWeeksBetween(dec, jan, SYD)).toBe(1);
  });

  it("gives a stable week key", () => {
    const a = zonedDateTimeToUtc("2026-07-20", "09:00", SYD);
    const b = zonedDateTimeToUtc("2026-07-24", "21:00", SYD);
    expect(isoWeekKeyInTimeZone(a, SYD)).toBe(isoWeekKeyInTimeZone(b, SYD));
  });
});

describe("formatClassWhen", () => {
  it("renders in the requested zone", () => {
    const instant = zonedDateTimeToUtc("2026-07-26", "18:00", SYD);
    expect(formatClassWhen(instant, SYD)).toContain("6:00pm");
    // Same instant, different viewer zone → different local time.
    expect(formatClassWhen(instant, PER)).toContain("4:00pm");
  });
});

describe("formatting helpers", () => {
  it("formats money", () => {
    expect(formatMoney(0)).toBe("Free");
    expect(formatMoney(2500)).toBe("$25.00");
    expect(formatMoney(1999)).toBe("$19.99");
  });

  it("formats durations", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(90)).toBe("1h 30m");
  });

  it("validates timezones", () => {
    expect(isValidTimeZone(SYD)).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
  });
});
