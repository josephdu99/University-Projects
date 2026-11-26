import { describe, expect, it } from "vitest";
import {
  csvUrlFor,
  guessMapping,
  isAllowedSheetHost,
  isSheetUrl,
  matchRow,
  matchStyle,
  mappedCount,
  missingFields,
  musicForStyle,
  parseDay,
  parsePrice,
  parseRepeat,
  parseTable,
  parseTime,
  rowsFromTable,
  snapLength,
  type StudioContext,
} from "@/lib/schedule-import";
import { appliedRow, diffSheet, kindOf, whenLabel } from "@/lib/schedule-diff";

// The sample sheet from the design handoff, as a studio would paste it.
const SAMPLE =
  "Class name\tDay\tTime\tFinish\tInstructor\tRoom\tLevel\tCost\n" +
  "Heels Choreo\tTuesday\t7pm\t8pm\tMaria\tStudio A\tOpen level\t$25\n" +
  "Hip Hop Foundations\tThursday\t6:00 PM\t7:00 PM\tJordan\tStudio B\tLevel 1\t$25\n" +
  "Salsa Social Basics\tSaturday\t4pm\t5:30pm\tJordan\tStudio A\tOpen level\t18\n" +
  "Bachata Partnerwork\tThursday\t7:30pm\t8:30pm\tMaria\tStudio A\tBeginner\t$25\n" +
  "K-pop Taster\tSunday\t11am\t\tMia\tStudio B\t\tFree";

const ctx: StudioContext = {
  styles: ["Salsa", "Bachata", "Heels", "Hip Hop", "K-pop"],
  teachers: [
    { id: "m-maria", name: "Maria Chen", wwccOk: false },
    { id: "m-jordan", name: "Jordan Lee", wwccOk: true },
  ],
  venues: [{ id: "v-redfern", name: "Redfern Town Hall", address: "73 Pitt St, Redfern" }],
  levelNames: [{ name: "Level 1", scale: "ABSOLUTE_BEGINNER" }],
  existing: [{ title: "Bachata Partnerwork", day: "Thu", time: "19:30" }],
};

describe("reading a table", () => {
  it("reads tab-separated cells and CSV with quotes", () => {
    expect(parseTable(SAMPLE)).toHaveLength(6);
    expect(parseTable('Class,Teacher\n"Salsa, Level 1","Maya ""M"" T"\n\n')).toEqual([
      ["Class", "Teacher"],
      ["Salsa, Level 1", 'Maya "M" T'],
    ]);
    expect(parseTable("﻿Class,Day\r\nSalsa,Tue\r\n")).toEqual([
      ["Class", "Day"],
      ["Salsa", "Tue"],
    ]);
  });

  it("matches headers by synonym, each column once", () => {
    const m = guessMapping(parseTable(SAMPLE)[0]);
    expect(m).toMatchObject({ title: "0", day: "1", start: "2", end: "3", teacher: "4", venue: "5", level: "6", price: "7" });
    expect(guessMapping(["Class", "Style", "Level", "Day", "Start", "End", "Teacher", "Venue", "Price", "Spots", "Repeats"])).toMatchObject({
      spots: "9",
      repeats: "10",
    });
    expect(mappedCount(guessMapping(["Salsa", "Tue", "7pm"]))).toBeLessThan(3);
  });
});

describe("values", () => {
  it("days, in any of the usual spellings", () => {
    expect(["Tue", "Tuesday", "tues", " TUESDAY "].map(parseDay)).toEqual(["Tue", "Tue", "Tue", "Tue"]);
    expect(parseDay("someday")).toBe("");
  });

  it("times: 7pm, 7:30 PM, 19:00, 1930, and a bare 1 to 7 as pm", () => {
    expect(parseTime("7pm")).toBe("19:00");
    expect(parseTime("7:30 PM")).toBe("19:30");
    expect(parseTime("19:00")).toBe("19:00");
    expect(parseTime("1930")).toBe("19:30");
    expect(parseTime("7")).toBe("19:00");
    expect(parseTime("11am")).toBe("11:00");
    expect(parseTime("12pm")).toBe("12:00");
    expect(parseTime("12am")).toBe("00:00");
    expect(parseTime("6.30pm")).toBe("18:30");
    expect(parseTime("25:00")).toBe("");
    expect(parseTime("soon")).toBe("");
  });

  it("length rounds to 45, 60, 75 or 90", () => {
    expect(snapLength(50)).toBe("45");
    expect(snapLength(55)).toBe("60");
    expect(snapLength(95)).toBe("90");
    expect(snapLength(70)).toBe("75");
  });

  it("prices keep the digits; free or trial is 0", () => {
    expect(parsePrice("$25")).toBe("25");
    expect(parsePrice("18")).toBe("18");
    expect(parsePrice("Free")).toBe("0");
    expect(parsePrice("Trial class")).toBe("0");
    expect(parsePrice("")).toBe("");
    expect(parsePrice("TBC")).toBe("");
  });

  it("repeats and music", () => {
    expect(parseRepeat("Fortnightly")).toBe("fortnightly");
    expect(parseRepeat("One-off")).toBe("once");
    expect(parseRepeat("")).toBe("weekly");
    expect(musicForStyle("Bachata")).toBe("latin");
    expect(musicForStyle("Tap")).toBe("any");
  });
});

describe("matching rows to the studio", () => {
  const table = parseTable(SAMPLE);
  const rows = rowsFromTable(table, guessMapping(table[0])).map((r) => matchRow(r, ctx));

  it("matches teachers by first name and maps levels through the studio's names", () => {
    const hipHop = rows.find((r) => r.title === "Hip Hop Foundations")!;
    expect(hipHop).toMatchObject({ teacher: "m-jordan", level: "ABSOLUTE_BEGINNER", style: "Hip Hop", day: "Thu", time: "18:00", dur: "60", price: "25" });
    expect(missingFields(hipHop)).toEqual([]);
  });

  it("an unknown room is taken as a room at the studio, flagged to check", () => {
    const heels = rows.find((r) => r.title === "Heels Choreo")!;
    expect(heels.venue).toBe("studio");
    expect(heels.room).toBe("Studio A");
    expect(heels.check).toContain("venue");
  });

  it("an unmapped level and an unknown teacher are red, with a note", () => {
    const heels = rows.find((r) => r.title === "Heels Choreo")!;
    expect(missingFields(heels)).toEqual(["level"]);
    expect(heels.notes.join(" ")).toMatch(/Open level.*isn’t mapped/);
    const kpop = rows.find((r) => r.title === "K-pop Taster")!;
    expect(missingFields(kpop)).toEqual(["level", "teacher"]);
    expect(kpop.notes.join(" ")).toMatch(/Mia.*isn’t on your team/);
  });

  it("no end time: 1h, flagged as a guess; free becomes a trial price", () => {
    const kpop = rows.find((r) => r.title === "K-pop Taster")!;
    expect(kpop.dur).toBe("60");
    expect(kpop.check).toContain("dur");
    expect(kpop.price).toBe("0");
  });

  it("a class already on the timetable is flagged and left out", () => {
    const bachata = rows.find((r) => r.title === "Bachata Partnerwork")!;
    expect(bachata.dup).toBe(true);
    expect(bachata.include).toBe(false);
  });

  it("a kids' class is left out until its teacher's check is verified", () => {
    const kids = matchRow(
      { title: "Hip Hop Kids", style: "Hip Hop", levelRaw: "", day: "Sat", time: "10:00", end: "11:00", teacherRaw: "Maria", venueRaw: "", price: "0", spots: "", repeat: "weekly", kids: true, uncertain: ["level"], why: "", index: 4 },
      ctx,
    );
    expect(kids.include).toBe(false);
    const verified = matchRow({ ...rowsFromTable(table, guessMapping(table[0]))[1], kids: true }, ctx);
    expect(verified.include).toBe(true);
  });

  it("styles match loosely: hiphop, Hip-hop, a style word in the title, Afro → Afrobeats", () => {
    expect(matchStyle("hiphop", "", ctx.styles)).toBe("Hip Hop");
    expect(matchStyle("", "Salsa On1 Level 2", ctx.styles)).toBe("Salsa");
    expect(matchStyle("", "Afro Taster", ctx.styles)).toBe("Afrobeats");
    expect(matchStyle("", "Open Practice", ctx.styles)).toBe("");
  });

  it("row keys are stable for the same row", () => {
    const again = rowsFromTable(table, guessMapping(table[0])).map((r) => matchRow(r, ctx));
    expect(again.map((r) => r.rowKey)).toEqual(rows.map((r) => r.rowKey));
    expect(new Set(rows.map((r) => r.rowKey)).size).toBe(rows.length);
  });
});

describe("sheet links", () => {
  it("only Google Sheets links, and only Google hosts on redirect", () => {
    expect(isSheetUrl("https://docs.google.com/spreadsheets/d/e/2PACX-1vAbc/pub?output=csv")).toBe(true);
    expect(isSheetUrl("https://evil.example/spreadsheets/x")).toBe(false);
    expect(isSheetUrl("http://docs.google.com/spreadsheets/d/x")).toBe(false);
    expect(isAllowedSheetHost("doc-0s-4k-sheets.googleusercontent.com")).toBe(true);
    expect(isAllowedSheetHost("googleusercontent.com.evil.example")).toBe(false);
    expect(isAllowedSheetHost("169.254.169.254")).toBe(false);
  });

  it("asks for CSV from a published or shared link", () => {
    expect(csvUrlFor("https://docs.google.com/spreadsheets/d/e/2PACX-1vAbc/pubhtml")).toBe(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vAbc/pub?output=csv",
    );
    expect(csvUrlFor("https://docs.google.com/spreadsheets/d/e/2PACX-1vAbc/pub?gid=0&single=true&output=csv")).toContain("output=csv");
    expect(csvUrlFor("https://docs.google.com/spreadsheets/d/1AbC_d-9/edit#gid=123")).toBe(
      "https://docs.google.com/spreadsheets/d/1AbC_d-9/export?format=csv&gid=123",
    );
  });
});

describe("syncing a sheet", () => {
  const table = parseTable(SAMPLE);
  const first = rowsFromTable(table, guessMapping(table[0])).map((r) => matchRow(r, { ...ctx, existing: [] }));
  const imported = first.map((r, i) => ({ seriesId: `s${i}`, row: appliedRow(r), booked: i === 3 ? 11 : 0 }));

  it("an unchanged sheet changes nothing", () => {
    const d = diffSheet(first, imported);
    expect(d).toEqual({ added: [], changed: [], removed: [] });
  });

  it("a time change on a booked class is a schedule change for approval", () => {
    const moved = parseTable(SAMPLE.replace("Bachata Partnerwork\tThursday\t7:30pm", "Bachata Partnerwork\tThursday\t7:45pm"));
    const now = rowsFromTable(moved, guessMapping(moved[0])).map((r) => matchRow(r, { ...ctx, existing: [] }));
    const d = diffSheet(now, imported);
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual([]);
    expect(d.changed).toHaveLength(1);
    expect(d.changed[0]).toMatchObject({ seriesId: "s3", kind: "schedule", booked: 11 });
    expect(d.changed[0].fields).toContain("time");
    expect(whenLabel(d.changed[0].row)).toBe("Thu 7:45pm");
    // The class keeps the key it was first imported with.
    expect(d.changed[0].row.rowKey).toBe(imported[3].row.rowKey);
  });

  it("a row added above the others still pairs every class by title", () => {
    const lines = SAMPLE.split("\n");
    const withNew = parseTable([lines[0], "Afrobeats Basics\tFriday\t6pm\t7pm\tJordan\tStudio A\tLevel 1\t$25", ...lines.slice(1)].join("\n"));
    const now = rowsFromTable(withNew, guessMapping(withNew[0])).map((r) => matchRow(r, { ...ctx, existing: [] }));
    const d = diffSheet(now, imported);
    expect(d.added.map((r) => r.title)).toEqual(["Afrobeats Basics"]);
    expect(d.changed).toEqual([]);
    expect(d.removed).toEqual([]);
  });

  it("a row deleted from the sheet is removed", () => {
    const without = parseTable(SAMPLE.split("\n").filter((l) => !l.startsWith("Salsa Social")).join("\n"));
    const now = rowsFromTable(without, guessMapping(without[0])).map((r) => matchRow(r, { ...ctx, existing: [] }));
    const d = diffSheet(now, imported);
    expect(d.removed.map((r) => r.seriesId)).toEqual(["s2"]);
  });

  it("kinds of change", () => {
    expect(kindOf(["teacher"])).toBe("details");
    expect(kindOf(["room"])).toBe("venue");
    expect(kindOf(["price", "day"])).toBe("schedule");
  });
});
