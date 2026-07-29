import { describe, it, expect } from "vitest";
import {
  getLevelInfo,
  LEVELS,
  BADGE_CATALOG,
  BADGE_BONUS_POINTS,
} from "@/lib/gamification-rules";

describe("getLevelInfo", () => {
  it("starts everyone at level 1", () => {
    const level = getLevelInfo(0);
    expect(level.levelNumber).toBe(1);
    expect(level.name).toBe("Newcomer");
    expect(level.progress).toBe(0);
  });

  it("puts a score on the right tier", () => {
    expect(getLevelInfo(100).name).toBe("Mover");
    expect(getLevelInfo(320).name).toBe("Groove Getter");
    expect(getLevelInfo(499).name).toBe("Groove Getter");
    expect(getLevelInfo(500).name).toBe("Rhythm Rider");
  });

  it("caps at the highest tier", () => {
    const top = getLevelInfo(999_999);
    expect(top.levelNumber).toBe(LEVELS.length);
    expect(top.name).toBe("StepUp Icon");
    expect(top.nextThreshold).toBeNull();
    expect(top.progress).toBe(1);
  });

  it("reports progress toward the next tier", () => {
    // Groove Getter spans 250–500, so 375 is halfway.
    const mid = getLevelInfo(375);
    expect(mid.nextThreshold).toBe(500);
    expect(mid.nextName).toBe("Rhythm Rider");
    expect(mid.progress).toBeCloseTo(0.5, 5);
  });

  it("keeps progress within 0..1 at every boundary", () => {
    for (const level of LEVELS) {
      for (const points of [level.min - 1, level.min, level.min + 1]) {
        const info = getLevelInfo(Math.max(0, points));
        expect(info.progress).toBeGreaterThanOrEqual(0);
        expect(info.progress).toBeLessThanOrEqual(1);
      }
    }
  });

  it("never decreases as points increase", () => {
    let previous = 0;
    for (let p = 0; p <= 6000; p += 50) {
      const n = getLevelInfo(p).levelNumber;
      expect(n).toBeGreaterThanOrEqual(previous);
      previous = n;
    }
  });
});

describe("badge catalog", () => {
  it("has unique codes", () => {
    const codes = BADGE_CATALOG.map((b) => b.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("has unique sort orders so the grid is stable", () => {
    const orders = BADGE_CATALOG.map((b) => b.sortOrder);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("gives every badge a name, description and emoji", () => {
    for (const badge of BADGE_CATALOG) {
      expect(badge.name.length).toBeGreaterThan(0);
      expect(badge.description.length).toBeGreaterThan(0);
      expect(badge.emoji.length).toBeGreaterThan(0);
    }
  });

  it("awards a positive bonus", () => {
    expect(BADGE_BONUS_POINTS).toBeGreaterThan(0);
  });
});

describe("level thresholds", () => {
  it("increase monotonically", () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].min).toBeGreaterThan(LEVELS[i - 1].min);
    }
  });

  it("start at zero", () => {
    expect(LEVELS[0].min).toBe(0);
  });
});
