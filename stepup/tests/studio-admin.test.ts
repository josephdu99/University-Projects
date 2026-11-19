import { describe, expect, it } from "vitest";
import {
  cancellationOutcome,
  effectivePolicy,
  freeCancelUntil,
  noShowStanding,
  policySentence,
  studentStatus,
} from "@/lib/policies";
import {
  fitsRole,
  neededChip,
  neededSide,
  nextFromWaitlist,
  roleCounts,
  roleSummary,
} from "@/lib/partner-roles";
import { levelOptionLabel, scaleLabel } from "@/lib/levels";
import { csvCell, toCsv } from "@/lib/csv";
import { money, splitFee, statementLines, statementTotals } from "@/lib/statement";
import { completeness, profileChecklist, tierFor } from "@/lib/profile-completeness";
import { matchTextClass, parseTextCommand, textKeyFor } from "@/lib/text-commands";
import { isWwccNumber, wwccCurrent, wwccReminderDue } from "@/lib/wwcc";
import { nextTermStart } from "@/lib/listing";
import { defaultTemplate, templateFor } from "@/lib/class-templates";

const start = new Date("2026-11-26T08:30:00Z"); // Thu 7:30pm Sydney
const hoursBefore = (h: number) => new Date(start.getTime() - h * 3600_000);

describe("cancellation presets", () => {
  it("cut off at 2, 12 and 24 hours", () => {
    expect(freeCancelUntil(start, "RELAXED")).toEqual(hoursBefore(2));
    expect(freeCancelUntil(start, "STANDARD")).toEqual(hoursBefore(12));
    expect(freeCancelUntil(start, "STRICT")).toEqual(hoursBefore(24));
  });

  it("give everything back before the cut-off, then what the preset says", () => {
    const base = { start, prepayRequired: false, movedSinceBooking: false };
    expect(cancellationOutcome({ ...base, now: hoursBefore(13), policy: "STANDARD" })).toBe("FULL");
    expect(cancellationOutcome({ ...base, now: hoursBefore(11), policy: "STANDARD" })).toBe("CREDIT");
    expect(cancellationOutcome({ ...base, now: hoursBefore(3), policy: "RELAXED" })).toBe("FULL");
    expect(cancellationOutcome({ ...base, now: hoursBefore(1), policy: "RELAXED" })).toBe("NONE");
    expect(cancellationOutcome({ ...base, now: hoursBefore(20), policy: "STRICT" })).toBe("NONE");
  });

  it("refund in full after a venue change, and never credit someone on prepay", () => {
    expect(cancellationOutcome({ start, now: hoursBefore(1), policy: "STRICT", prepayRequired: false, movedSinceBooking: true })).toBe("FULL");
    expect(cancellationOutcome({ start, now: hoursBefore(11), policy: "STANDARD", prepayRequired: true, movedSinceBooking: false })).toBe("NONE");
  });

  it("fall back from the class to the studio to Standard", () => {
    expect(effectivePolicy("STRICT", "RELAXED")).toBe("STRICT");
    expect(effectivePolicy(null, "RELAXED")).toBe("RELAXED");
    expect(effectivePolicy(undefined, null)).toBe("STANDARD");
    expect(policySentence("STANDARD")).toBe(
      "Free cancellation until 12 hours before class. After that, you get credit, not a refund.",
    );
  });

  it("warn after two no-shows and require prepay after three", () => {
    expect(noShowStanding(1)).toBe("OK");
    expect(noShowStanding(2)).toBe("WARNED");
    expect(noShowStanding(3)).toBe("PREPAY");
    expect(studentStatus(1, 0)).toBe("New");
    expect(studentStatus(4, 1)).toBe("Regular");
    expect(studentStatus(4, 2)).toBe("Warned");
    expect(studentStatus(4, 5)).toBe("Prepay required");
  });
});

describe("lead and follow balancing", () => {
  const caps = { rule: "CAPS" as const, leadCap: 2, followCap: 2 };
  const balance = { rule: "BALANCE" as const, balanceX: 1 };

  it("pairs Either with whichever side is short", () => {
    expect(roleCounts(["LEAD", "LEAD", "FOLLOW", "EITHER"])).toEqual({ leads: 2, follows: 2 });
    expect(roleCounts(["EITHER", "EITHER", "EITHER"])).toEqual({ leads: 2, follows: 1 });
    expect(neededSide(["FOLLOW", "FOLLOW", "LEAD"])).toBe("LEAD");
    expect(neededChip(["LEAD", "FOLLOW"])).toBe("Leads and follows balanced");
  });

  it("keeps separate caps, letting Either take any room left", () => {
    expect(fitsRole(caps, ["LEAD", "LEAD"], "LEAD")).toBe(false);
    expect(fitsRole(caps, ["LEAD", "LEAD"], "FOLLOW")).toBe(true);
    expect(fitsRole(caps, ["LEAD", "LEAD", "FOLLOW"], "EITHER")).toBe(true);
    expect(fitsRole(caps, ["LEAD", "LEAD", "FOLLOW", "FOLLOW"], "EITHER")).toBe(false);
  });

  it("keeps the sides within X of each other", () => {
    expect(fitsRole(balance, [], "LEAD")).toBe(true);
    expect(fitsRole(balance, ["LEAD"], "LEAD")).toBe(false);
    expect(fitsRole(balance, ["LEAD"], "FOLLOW")).toBe(true);
    expect(fitsRole(balance, ["LEAD", "LEAD", "EITHER"], "EITHER")).toBe(true);
    expect(fitsRole({ rule: "NONE" }, ["LEAD", "LEAD", "LEAD"], "LEAD")).toBe(true);
  });

  it("offers a spot to the first person waiting whose role now fits", () => {
    const waiting = [
      { id: "w1", role: "LEAD" },
      { id: "w2", role: "FOLLOW" },
    ];
    // A lead just booked: leads are ahead, so the first waiting follow gets in.
    expect(nextFromWaitlist(balance, ["LEAD", "LEAD", "FOLLOW"], waiting)?.id).toBe("w2");
    expect(nextFromWaitlist(balance, ["LEAD", "FOLLOW"], waiting)?.id).toBe("w1");
    expect(nextFromWaitlist(null, [], waiting)?.id).toBe("w1");
  });

  it("summarises the room for the studio", () => {
    expect(roleSummary(caps, ["LEAD", "FOLLOW", "FOLLOW"])).toBe("Leads 1/2 · Follows 2/2 · Leads needed");
    expect(roleSummary({ rule: "BALANCE", balanceX: 1 }, ["LEAD", "FOLLOW"])).toBe("Leads 1 · Follows 1 · within 1 · Balanced");
    expect(roleSummary({ rule: "NONE" }, [])).toBe("Partner class, no role limits");
  });
});

describe("the level scale", () => {
  it("names levels and shows a studio's own names beside them", () => {
    expect(scaleLabel("ABSOLUTE_BEGINNER")).toBe("Absolute beginner");
    expect(levelOptionLabel("BEGINNER", [{ name: "Open level", scale: "BEGINNER" }, { name: "Level 2", scale: "IMPROVER" }])).toBe(
      "Beginner (your Open level)",
    );
  });
});

describe("CSV exports", () => {
  it("quote cells and defuse formulas from student-typed text", () => {
    expect(csvCell('Say "hi"')).toBe('"Say ""hi"""');
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
    expect(csvCell("-18.00")).toBe('"-18.00"');
    expect(toCsv([["a", 1]])).toBe('﻿"a","1"\r\n');
  });
});

describe("the monthly statement", () => {
  const entries = [
    { date: new Date("2026-10-23"), classTitle: "Bachata", student: "Jess", type: "AGENT" as const, amountCents: 2500, feeCents: 375 },
    { date: new Date("2026-10-25"), classTitle: "Salsa", student: "Ravi", type: "AGENT" as const, amountCents: 1800, feeCents: 270 },
    { date: new Date("2026-10-26"), classTitle: "Salsa", student: "Ravi (refund)", type: "REFUND" as const, amountCents: -1800, feeCents: -270 },
  ];

  it("charges no GST until StepUp is registered", () => {
    expect(splitFee(330, false)).toEqual({ commission: 330, gst: 0 });
    expect(splitFee(330, true)).toEqual({ commission: 300, gst: 30 });
  });

  it("adds up to what reaches the studio", () => {
    const lines = statementLines(entries, false);
    const t = statementTotals(lines);
    expect(t).toEqual({ gross: 4300, refunds: -1800, commission: 375, gst: 0, net: 2125 });
    expect(lines[2].netCents).toBe(-1530);
    expect(money(-1530)).toBe("-$15.30");
    expect(money(115000)).toBe("$1,150.00");
  });
});

describe("profile completeness", () => {
  const all = { bioLength: 120, photos: 3, styles: 2, levelsMapped: 1, hasVenue: true, termsPublished: true, payoutsConnected: true, classListed: true, approved: true };

  it("counts nine things and unlocks tiers at 80 and 100", () => {
    expect(profileChecklist(all)).toHaveLength(9);
    expect(completeness(profileChecklist(all))).toBe(100);
    expect(tierFor(100)).toBe("ELITE");
    const pct = completeness(profileChecklist({ ...all, photos: 1, approved: false }));
    expect(pct).toBe(78);
    expect(tierFor(pct)).toBe("STANDARD");
    expect(tierFor(89)).toBe("FEATURED");
  });
});

describe("text commands", () => {
  it("read the three commands and a reply", () => {
    expect(parseTextCommand("cancel thu salsa")).toEqual({ kind: "CANCEL", day: "thu", words: ["salsa"] });
    expect(parseTextCommand("msg Thu Salsa: we're in Studio B")).toEqual({
      kind: "MESSAGE", day: "thu", words: ["salsa"], message: "we're in Studio B",
    });
    expect(parseTextCommand("move thu salsa to Redfern hall")).toEqual({
      kind: "MOVE", day: "thu", words: ["salsa"], venue: "Redfern hall",
    });
    expect(parseTextCommand("YES")).toEqual({ kind: "CONFIRM" });
    expect(parseTextCommand("no")).toEqual({ kind: "DECLINE" });
    expect(parseTextCommand("cancel blursday salsa").kind).toBe("UNKNOWN");
    expect(parseTextCommand("hello").kind).toBe("UNKNOWN");
  });

  it("find the soonest matching class on that day", () => {
    const now = new Date("2026-11-19T00:00:00Z");
    const classes = [
      { id: "a", title: "Salsa Foundations", style: "Salsa", startTime: new Date("2026-12-03T08:00:00Z"), dow: 4, key: "2026-12-03" },
      { id: "b", title: "Salsa Foundations", style: "Salsa", startTime: new Date("2026-11-26T08:00:00Z"), dow: 4, key: "2026-11-26" },
      { id: "c", title: "Bachata Partnerwork", style: "Bachata", startTime: new Date("2026-11-26T09:00:00Z"), dow: 4, key: "2026-11-26" },
    ];
    const local = (c: (typeof classes)[number]) => ({ dow: c.dow, dateKey: c.key });
    expect(matchTextClass(classes, "thu", ["salsa"], now, local, "2026-11-19", "2026-11-20")?.id).toBe("b");
    expect(matchTextClass(classes, "thu", ["bachata", "partner"], now, local, "2026-11-19", "2026-11-20")?.id).toBe("c");
    expect(matchTextClass(classes, "fri", ["salsa"], now, local, "2026-11-19", "2026-11-20")).toBeNull();
    expect(textKeyFor(4, "Salsa", "Salsa Foundations")).toBe("thu salsa");
  });
});

describe("Working With Children Checks", () => {
  const now = new Date("2026-11-19T00:00:00Z");
  it("check the number's shape", () => {
    expect(isWwccNumber("WWC1234567E")).toBe(true);
    expect(isWwccNumber("wwc 1234567 v")).toBe(true);
    expect(isWwccNumber("WWC123456E")).toBe(false);
  });

  it("are current only when verified and in date, and remind once 30 days out", () => {
    const rec = { wwccNumber: "WWC1234567E", wwccVerifiedAt: now, wwccExpiry: new Date("2026-12-10T00:00:00Z"), wwccReminderAt: null };
    expect(wwccCurrent(rec, now)).toBe(true);
    expect(wwccCurrent({ ...rec, wwccVerifiedAt: null }, now)).toBe(false);
    expect(wwccReminderDue(rec, now)).toBe(true);
    expect(wwccReminderDue({ ...rec, wwccReminderAt: now }, now)).toBe(false);
    expect(wwccReminderDue({ ...rec, wwccExpiry: new Date("2027-06-01T00:00:00Z") }, now)).toBe(false);
  });
});

describe("courses and templates", () => {
  it("start the next term the week after the last class", () => {
    expect(nextTermStart("2026-11-24", 8)).toBe("2027-01-19");
  });

  it("start a class from the studio's own words, else StepUp's", () => {
    expect(defaultTemplate("Heels", "BEGINNER").wear).toMatch(/heels/);
    expect(defaultTemplate("Salsa", "ABSOLUTE_BEGINNER").description).toMatch(/^Salsa for absolute beginners\./);
    const saved = [{ style: "Salsa", scale: "BEGINNER", description: "Ours", wear: "W", plan: "P" }];
    expect(templateFor("Salsa", "BEGINNER", saved)).toMatchObject({ description: "Ours", saved: true });
    expect(templateFor("Salsa", "IMPROVER", saved).saved).toBe(false);
  });
});
