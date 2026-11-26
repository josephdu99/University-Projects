import { describe, expect, it } from "vitest";
import { daysBetween, planReschedule, rescheduleChanges, rescheduleProblem } from "@/lib/reschedule";
import { toFormFields, zonedDateTimeToUtc } from "@/lib/time";

const TZ = "Australia/Sydney";
const at = (date: string, time: string) => zonedDateTimeToUtc(date, time, TZ);
const local = (d: Date) => {
  const f = toFormFields(d, TZ);
  return `${f.date} ${f.time}`;
};

describe("reschedule", () => {
  it("counts whole days between dates", () => {
    expect(daysBetween("2026-11-30", "2026-12-02")).toBe(2);
    expect(daysBetween("2026-12-02", "2026-11-30")).toBe(-2);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
  });

  it("moves one class to the new date and time", () => {
    const plan = planReschedule({ sessions: [{ id: "a", startTime: at("2026-11-30", "19:00") }], timezone: TZ, date: "2026-12-02", time: "18:30" });
    expect(plan).toHaveLength(1);
    expect(local(plan[0].newStart)).toBe("2026-12-02 18:30");
  });

  it("moves later classes by the same days, to the same time", () => {
    const plan = planReschedule({
      sessions: [
        { id: "a", startTime: at("2026-11-30", "19:00") },
        { id: "b", startTime: at("2026-12-07", "19:00") },
        { id: "c", startTime: at("2026-12-14", "19:00") },
      ],
      timezone: TZ,
      date: "2026-12-02",
      time: "18:30",
    });
    expect(plan.map((m) => local(m.newStart))).toEqual(["2026-12-02 18:30", "2026-12-09 18:30", "2026-12-16 18:30"]);
  });

  it("keeps the local time across a daylight-saving change", () => {
    // Sydney's clocks go back on 5 April 2026.
    const plan = planReschedule({
      sessions: [
        { id: "a", startTime: at("2026-03-30", "19:00") },
        { id: "b", startTime: at("2026-04-06", "19:00") },
      ],
      timezone: TZ,
      date: "2026-03-31",
      time: "19:00",
    });
    expect(plan.map((m) => local(m.newStart))).toEqual(["2026-03-31 19:00", "2026-04-07 19:00"]);
  });

  it("refuses a time that's passed, a bad length, or a clash in the series", () => {
    const now = at("2026-11-26", "12:00");
    const plan = planReschedule({ sessions: [{ id: "a", startTime: at("2026-11-30", "19:00") }], timezone: TZ, date: "2026-11-25", time: "19:00" });
    const base = { date: "2026-11-25", time: "19:00", durationMin: 60, timezone: TZ, now, plan, others: [] as Date[] };
    expect(rescheduleProblem(base)).toBe("Pick a time that hasn't passed yet.");
    expect(rescheduleProblem({ ...base, time: "7pm" })).toBe("Pick a start time.");
    expect(rescheduleProblem({ ...base, durationMin: 5 })).toMatch(/Pick a length/);

    const later = planReschedule({ sessions: [{ id: "a", startTime: at("2026-11-30", "19:00") }], timezone: TZ, date: "2026-12-07", time: "19:00" });
    expect(rescheduleProblem({ ...base, date: "2026-12-07", plan: later, others: [at("2026-12-07", "19:00")] })).toMatch(/same day as another class/);
    expect(rescheduleProblem({ ...base, date: "2026-12-07", plan: later })).toBeNull();
  });

  it("knows when nothing has changed", () => {
    const start = at("2026-11-30", "19:00");
    const same = planReschedule({ sessions: [{ id: "a", startTime: start }], timezone: TZ, date: "2026-11-30", time: "19:00" });
    expect(rescheduleChanges({ plan: same, current: { durationMin: 60, venueId: null }, durationMin: 60, venueId: null })).toEqual({
      time: false,
      length: false,
      venue: false,
    });
    expect(rescheduleChanges({ plan: same, current: { durationMin: 60, venueId: null }, durationMin: 75, venueId: "v1" })).toEqual({
      time: false,
      length: true,
      venue: true,
    });
  });
});
