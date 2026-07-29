import { describe, it, expect } from "vitest";
import {
  qualifyingBadges,
  nextStreak,
  type AttendedClass,
} from "@/lib/gamification-rules";
import { zonedDateTimeToUtc, addDaysToDateString } from "@/lib/time";

const SYD = "Australia/Sydney";
const MEL = "Australia/Melbourne";

function mkClass(overrides: Partial<AttendedClass> = {}): AttendedClass {
  return {
    style: "Hip Hop",
    studioId: "studio-1",
    format: "IN_PERSON",
    startTime: zonedDateTimeToUtc("2026-07-26", "18:00", SYD),
    timezone: SYD,
    ...overrides,
  };
}

describe("qualifyingBadges — attendance milestones", () => {
  it("awards nothing with no attendance", () => {
    expect(qualifyingBadges([], 0).size).toBe(0);
  });

  it("awards First Steps on the first class", () => {
    const badges = qualifyingBadges([mkClass()], 1);
    expect(badges.has("FIRST_CLASS")).toBe(true);
    expect(badges.has("FIVE_CLASSES")).toBe(false);
  });

  it("awards Regular at five classes", () => {
    const five = Array.from({ length: 5 }, () => mkClass());
    expect(qualifyingBadges(five, 1).has("FIVE_CLASSES")).toBe(true);
  });

  it("awards Dedicated Dancer at twenty", () => {
    const nineteen = Array.from({ length: 19 }, () => mkClass());
    expect(qualifyingBadges(nineteen, 1).has("TWENTY_CLASSES")).toBe(false);
    expect(qualifyingBadges([...nineteen, mkClass()], 1).has("TWENTY_CLASSES")).toBe(true);
  });
});

describe("qualifyingBadges — streaks", () => {
  it("awards On a Roll at a three-week streak", () => {
    expect(qualifyingBadges([mkClass()], 2).has("STREAK_3")).toBe(false);
    expect(qualifyingBadges([mkClass()], 3).has("STREAK_3")).toBe(true);
  });

  it("awards Unstoppable at eight weeks", () => {
    expect(qualifyingBadges([mkClass()], 7).has("STREAK_8")).toBe(false);
    expect(qualifyingBadges([mkClass()], 8).has("STREAK_8")).toBe(true);
  });
});

describe("qualifyingBadges — variety", () => {
  it("awards Style Explorer for five distinct styles", () => {
    const styles = ["Hip Hop", "Salsa", "Ballet", "Jazz"].map((style) =>
      mkClass({ style })
    );
    expect(qualifyingBadges(styles, 1).has("STYLE_EXPLORER")).toBe(false);
    expect(
      qualifyingBadges([...styles, mkClass({ style: "Heels" })], 1).has(
        "STYLE_EXPLORER"
      )
    ).toBe(true);
  });

  it("doesn't count the same style twice", () => {
    const repeats = Array.from({ length: 10 }, () => mkClass({ style: "Salsa" }));
    expect(qualifyingBadges(repeats, 1).has("STYLE_EXPLORER")).toBe(false);
  });

  it("awards Social Butterfly for three distinct studios", () => {
    const two = [mkClass({ studioId: "a" }), mkClass({ studioId: "b" })];
    expect(qualifyingBadges(two, 1).has("SOCIAL_BUTTERFLY")).toBe(false);
    expect(
      qualifyingBadges([...two, mkClass({ studioId: "c" })], 1).has(
        "SOCIAL_BUTTERFLY"
      )
    ).toBe(true);
  });

  it("ignores online classes when counting studios", () => {
    // Online classes have no studio; they must not count toward the badge.
    const online = Array.from({ length: 5 }, () =>
      mkClass({ studioId: null, format: "ONLINE" })
    );
    expect(qualifyingBadges(online, 1).has("SOCIAL_BUTTERFLY")).toBe(false);
  });

  it("awards Online Pioneer at five online classes", () => {
    const four = Array.from({ length: 4 }, () =>
      mkClass({ format: "ONLINE", studioId: null })
    );
    expect(qualifyingBadges(four, 1).has("ONLINE_PIONEER")).toBe(false);
    expect(
      qualifyingBadges(
        [...four, mkClass({ format: "ONLINE", studioId: null })],
        1
      ).has("ONLINE_PIONEER")
    ).toBe(true);
  });
});

describe("qualifyingBadges — time of day", () => {
  it("awards Early Bird for a class before 8am local time", () => {
    const early = mkClass({
      startTime: zonedDateTimeToUtc("2026-07-26", "07:00", SYD),
    });
    const badges = qualifyingBadges([early], 1);
    expect(badges.has("EARLY_BIRD")).toBe(true);
    expect(badges.has("NIGHT_OWL")).toBe(false);
  });

  it("awards Night Owl for a class at or after 8pm local time", () => {
    const late = mkClass({
      startTime: zonedDateTimeToUtc("2026-07-26", "20:00", SYD),
    });
    const badges = qualifyingBadges([late], 1);
    expect(badges.has("NIGHT_OWL")).toBe(true);
    expect(badges.has("EARLY_BIRD")).toBe(false);
  });

  it("does not mistake a UTC hour for a local hour", () => {
    // 7am Sydney is 21:00 UTC. Reading the server clock would have awarded
    // Night Owl here — the exact bug these tests guard against.
    const earlySydney = mkClass({
      startTime: zonedDateTimeToUtc("2026-07-26", "07:00", SYD),
      timezone: SYD,
    });
    expect(earlySydney.startTime.getUTCHours()).toBe(21);

    const badges = qualifyingBadges([earlySydney], 1);
    expect(badges.has("EARLY_BIRD")).toBe(true);
    expect(badges.has("NIGHT_OWL")).toBe(false);
  });

  it("evaluates each class in its own timezone", () => {
    const sydneyEvening = mkClass({
      startTime: zonedDateTimeToUtc("2026-07-26", "19:00", SYD),
      timezone: SYD,
    });
    const melbourneMorning = mkClass({
      startTime: zonedDateTimeToUtc("2026-07-26", "06:30", MEL),
      timezone: MEL,
    });

    const badges = qualifyingBadges([sydneyEvening, melbourneMorning], 1);
    expect(badges.has("EARLY_BIRD")).toBe(true);
    expect(badges.has("NIGHT_OWL")).toBe(false);
  });

  it("treats 8pm exactly as Night Owl and 8am exactly as not Early Bird", () => {
    const eightPm = qualifyingBadges(
      [mkClass({ startTime: zonedDateTimeToUtc("2026-07-26", "20:00", SYD) })],
      1
    );
    expect(eightPm.has("NIGHT_OWL")).toBe(true);

    const eightAm = qualifyingBadges(
      [mkClass({ startTime: zonedDateTimeToUtc("2026-07-26", "08:00", SYD) })],
      1
    );
    expect(eightAm.has("EARLY_BIRD")).toBe(false);
  });
});

describe("nextStreak", () => {
  const base = { currentStreak: 3, timezone: SYD };

  it("starts at 1 for a first-ever class", () => {
    expect(
      nextStreak({
        ...base,
        lastAttendedAt: null,
        currentStreak: 0,
        now: zonedDateTimeToUtc("2026-07-26", "18:00", SYD),
      })
    ).toBe(1);
  });

  it("does not extend within the same week", () => {
    expect(
      nextStreak({
        ...base,
        lastAttendedAt: zonedDateTimeToUtc("2026-07-20", "18:00", SYD),
        now: zonedDateTimeToUtc("2026-07-24", "18:00", SYD),
      })
    ).toBe(3);
  });

  it("extends in the following week", () => {
    expect(
      nextStreak({
        ...base,
        lastAttendedAt: zonedDateTimeToUtc("2026-07-20", "18:00", SYD),
        now: zonedDateTimeToUtc("2026-07-27", "18:00", SYD),
      })
    ).toBe(4);
  });

  it("resets after a missed week", () => {
    expect(
      nextStreak({
        ...base,
        lastAttendedAt: zonedDateTimeToUtc("2026-07-20", "18:00", SYD),
        now: zonedDateTimeToUtc("2026-08-10", "18:00", SYD),
      })
    ).toBe(1);
  });

  it("builds a six-week streak week by week", () => {
    let streak = 0;
    let last: Date | null = null;

    for (let week = 0; week < 6; week++) {
      const now = zonedDateTimeToUtc(
        addDaysToDateString("2026-07-06", week * 7),
        "18:00",
        SYD
      );
      streak = nextStreak({
        lastAttendedAt: last,
        currentStreak: streak,
        now,
        timezone: SYD,
      });
      last = now;
    }

    expect(streak).toBe(6);
  });
});
