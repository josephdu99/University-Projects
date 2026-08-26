import { describe, it, expect } from "vitest";
import {
  EVERYWHERE,
  isMetric,
  nextUpFrom,
  rankBoard,
  type BoardRow,
} from "@/lib/leaderboard";
import { monthBoundsInTimeZone } from "@/lib/time";

function dancer(
  name: string,
  classes: number,
  styles: number,
  city: string | null = "Sydney",
  isViewer = false
): BoardRow {
  return {
    userId: name,
    name,
    initials: name.slice(0, 2).toUpperCase(),
    hue: 35,
    city,
    classes,
    styles,
    isViewer,
    privateToViewer: false,
  };
}

describe("rankBoard", () => {
  it("ranks on the selected metric", () => {
    const rows = [
      dancer("Ana", 3, 5),
      dancer("Ben", 9, 1),
      dancer("Cal", 6, 3),
    ];

    expect(rankBoard(rows, "classes", EVERYWHERE).map((r) => r.name)).toEqual([
      "Ben",
      "Cal",
      "Ana",
    ]);
    expect(rankBoard(rows, "styles", EVERYWHERE).map((r) => r.name)).toEqual([
      "Ana",
      "Cal",
      "Ben",
    ]);
  });

  it("gives tied dancers the same rank and resumes after the gap", () => {
    const board = rankBoard(
      [dancer("Ana", 9, 1), dancer("Ben", 8, 1), dancer("Cal", 8, 1), dancer("Dee", 4, 1)],
      "classes",
      EVERYWHERE
    );

    // Two dancers on 8 are both 2nd; the next one is 4th, not 3rd.
    expect(board.map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });

  it("breaks tie display order alphabetically", () => {
    const board = rankBoard(
      [dancer("Zoe", 5, 1), dancer("Abe", 5, 1)],
      "classes",
      EVERYWHERE
    );
    expect(board.map((r) => r.name)).toEqual(["Abe", "Zoe"]);
    expect(board.map((r) => r.rank)).toEqual([1, 1]);
  });

  it("filters by city, and Everywhere keeps everyone", () => {
    const rows = [
      dancer("Ana", 9, 1, "Sydney"),
      dancer("Ben", 8, 1, "Melbourne"),
      dancer("Cal", 7, 1, null),
    ];

    expect(rankBoard(rows, "classes", "Sydney").map((r) => r.name)).toEqual(["Ana"]);
    expect(rankBoard(rows, "classes", EVERYWHERE)).toHaveLength(3);
  });

  it("carries the other metric as the row's secondary stat", () => {
    const [row] = rankBoard([dancer("Ana", 9, 4)], "classes", EVERYWHERE);
    expect(row.value).toBe(9);
    expect(row.secondary).toBe(4);
  });
});

describe("nextUpFrom", () => {
  it("names the nearest dancer actually ahead, and the real gap", () => {
    const board = rankBoard(
      [
        dancer("Ana Smith", 9, 1),
        dancer("Ben Jones", 6, 1),
        dancer("Cal Wu", 5, 1, "Sydney", true),
      ],
      "classes",
      EVERYWHERE
    );

    expect(nextUpFrom(board, 2)).toEqual({ name: "Ben", gap: 1 });
  });

  it("skips dancers who are only level with the viewer", () => {
    // A tie is not a target: the dancer above on the same score gives you
    // nothing to aim at, so the line reaches past them.
    const board = rankBoard(
      [dancer("Ana", 9, 1), dancer("Ben", 5, 1), dancer("Cal", 5, 1, "Sydney", true)],
      "classes",
      EVERYWHERE
    );

    expect(nextUpFrom(board, 2)).toEqual({ name: "Ana", gap: 4 });
  });

  it("returns nothing for the dancer on top", () => {
    const board = rankBoard(
      [dancer("Ana", 9, 1, "Sydney", true), dancer("Ben", 5, 1)],
      "classes",
      EVERYWHERE
    );
    expect(nextUpFrom(board, 0)).toBeNull();
  });
});

describe("isMetric", () => {
  it("accepts the two real metrics and nothing else", () => {
    expect(isMetric("classes")).toBe(true);
    expect(isMetric("styles")).toBe(true);
    expect(isMetric("points")).toBe(false);
    expect(isMetric(undefined)).toBe(false);
  });
});

describe("monthBoundsInTimeZone", () => {
  it("starts the month at local midnight, not UTC midnight", () => {
    const { start, end } = monthBoundsInTimeZone(
      new Date("2026-08-15T00:00:00Z"),
      "Australia/Sydney"
    );
    // Sydney is UTC+10 in August, so 1 August 00:00 local is 31 July 14:00Z.
    expect(start.toISOString()).toBe("2026-07-31T14:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-31T14:00:00.000Z");
  });

  it("rolls the year over in December", () => {
    const { start, end } = monthBoundsInTimeZone(
      new Date("2026-12-20T00:00:00Z"),
      "UTC"
    );
    expect(start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("puts an instant near the boundary in the month its own zone says", () => {
    // 1 August 02:00 in Sydney is still 31 July in UTC. The dancer's month is
    // the one they are living in.
    const instant = new Date("2026-07-31T16:00:00Z");
    expect(
      monthBoundsInTimeZone(instant, "Australia/Sydney").start.toISOString()
    ).toBe("2026-07-31T14:00:00.000Z");
    expect(monthBoundsInTimeZone(instant, "UTC").start.toISOString()).toBe(
      "2026-07-01T00:00:00.000Z"
    );
  });
});
