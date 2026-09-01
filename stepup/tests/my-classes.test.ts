import { describe, it, expect } from "vitest";
import {
  attendedNotes,
  attendedSummary,
  countdownLabel,
  phaseOf,
} from "@/lib/my-classes";

const SYD = "Australia/Sydney";
/** 1 Sep 2026, 10:00am in Sydney. */
const NOW = new Date("2026-09-01T00:00:00Z");
const at = (iso: string) => new Date(iso);

describe("phaseOf", () => {
  it("is 'now' inside the last quarter hour before the start", () => {
    expect(phaseOf(at("2026-09-01T00:10:00Z"), 60, NOW, SYD)).toBe("now");
  });

  it("stays 'now' while the class is under way", () => {
    expect(phaseOf(at("2026-08-31T23:30:00Z"), 60, NOW, SYD)).toBe("now");
  });

  it("is no longer 'now' once the class has finished", () => {
    // Started 90 minutes ago, ran for 60.
    expect(phaseOf(at("2026-08-31T22:30:00Z"), 60, NOW, SYD)).not.toBe("now");
  });

  it("is 'today' later the same day in the dancer's zone", () => {
    expect(phaseOf(at("2026-09-01T09:00:00Z"), 60, NOW, SYD)).toBe("today");
  });

  it("uses the dancer's calendar day, not UTC's", () => {
    // 1 Sep 21:00Z is still 1 Sep in UTC but already 2 Sep in Sydney.
    expect(phaseOf(at("2026-09-01T21:00:00Z"), 60, NOW, SYD)).toBe("tomorrow");
    expect(phaseOf(at("2026-09-01T21:00:00Z"), 60, NOW, "UTC")).toBe("today");
  });

  it("is 'soon' beyond tomorrow", () => {
    expect(phaseOf(at("2026-09-05T09:00:00Z"), 60, NOW, SYD)).toBe("soon");
  });
});

describe("countdownLabel", () => {
  it("counts whole days, so a late class tomorrow is not 'in 2 days'", () => {
    const start = at("2026-09-03T13:00:00Z"); // 3 Sep 11pm Sydney
    expect(countdownLabel("soon", start, NOW, SYD)).toBe("IN 2 DAYS");
  });

  it("switches to hours on the day, and minutes inside the hour", () => {
    expect(countdownLabel("today", at("2026-09-01T03:00:00Z"), NOW, SYD)).toBe(
      "TODAY, IN 3 HOURS"
    );
    expect(countdownLabel("today", at("2026-09-01T00:40:00Z"), NOW, SYD)).toBe(
      "TODAY, IN 40 MIN"
    );
  });

  it("has fixed wording for now and tomorrow", () => {
    expect(countdownLabel("now", NOW, NOW, SYD)).toBe("STARTING NOW");
    expect(countdownLabel("tomorrow", NOW, NOW, SYD)).toBe("TOMORROW");
  });

  it("never says 'in 0 days'", () => {
    expect(countdownLabel("soon", at("2026-09-01T23:00:00Z"), NOW, "UTC")).toBe(
      "IN 1 DAY"
    );
  });
});

describe("attendedNotes", () => {
  const past = [
    { id: "a", style: "Bachata", format: "IN_PERSON" },
    { id: "b", style: "Bachata", format: "IN_PERSON" },
    { id: "c", style: "Salsa", format: "IN_PERSON" },
    { id: "d", style: "Salsa", format: "ONLINE" },
  ];

  it("marks the first class, and the first of each new style", () => {
    const notes = attendedNotes(past);
    expect(notes.get("a")).toBe("Where it started");
    expect(notes.get("c")).toBe("First salsa class");
  });

  it("leaves a repeat of a style you already danced unmarked", () => {
    expect(attendedNotes(past).has("b")).toBe(false);
  });

  it("marks the first online class", () => {
    expect(attendedNotes(past).get("d")).toBe("First class online");
  });

  it("gives one class one note — the first ever is not also a style first", () => {
    const notes = attendedNotes([{ id: "solo", style: "Heels", format: "ONLINE" }]);
    expect([...notes.values()]).toEqual(["Where it started"]);
  });
});

describe("attendedSummary", () => {
  it("counts classes, styles and studios, and dates the start", () => {
    expect(
      attendedSummary(
        [
          { style: "Bachata", studio: "Salsa Casa" },
          { style: "Bachata", studio: "Salsa Casa" },
          { style: "Salsa", studio: "Rhythm Room" },
        ],
        at("2026-03-10T00:00:00Z"),
        SYD
      )
    ).toBe("3 classes, 2 styles, 2 studios since March 2026");
  });

  it("leaves studios out when every class was online", () => {
    expect(
      attendedSummary([{ style: "Hip Hop", studio: null }], null, SYD)
    ).toBe("1 class, 1 style");
  });

  it("says nothing rather than zero when there is no history", () => {
    expect(attendedSummary([], null, SYD)).toBe("Nothing danced yet");
  });
});
