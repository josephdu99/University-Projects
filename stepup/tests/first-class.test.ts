import { describe, it, expect } from "vitest";
import {
  rankClasses,
  matchesWhen,
  matchesWhere,
  matchesMusic,
  opennessOf,
  answersFromParams,
  answersToParams,
  type Answers,
  type CandidateClass,
} from "@/lib/first-class";

const SYD = "Australia/Sydney";

/** 2026-11-18 is a Wednesday; hours are Sydney local. */
function at(day: number, hour: number): Date {
  // Build from a Sydney wall clock, then let the helpers read it back.
  return new Date(
    `2026-11-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00+11:00`,
  );
}

function cls(over: Partial<CandidateClass> = {}): CandidateClass {
  return {
    id: over.id ?? "c1",
    title: over.title ?? "Salsa Foundations",
    style: over.style ?? "Salsa",
    level: over.level ?? "BEGINNER",
    format: over.format ?? "IN_PERSON",
    location: over.location ?? null,
    startTime: over.startTime ?? at(18, 19),
    timezone: over.timezone ?? SYD,
    durationMin: over.durationMin ?? 60,
    capacity: over.capacity ?? 20,
    priceCents: over.priceCents ?? 0,
    currency: over.currency ?? "aud",
    seatsTaken: over.seatsTaken ?? 0,
    firstTimersBooked: over.firstTimersBooked ?? 0,
    studioName: over.studioName ?? "Ritmo",
    studioCity: over.studioCity ?? "Sydney",
    hostName: over.hostName ?? "Maya",
    ...over,
  };
}

const NO_ANSWERS: Answers = { goals: [], music: null, where: "", when: [] };

describe("openness", () => {
  it("only lets beginner-friendly levels into the funnel", () => {
    expect(opennessOf("BEGINNER")).toBe("first-timer");
    expect(opennessOf("ALL_LEVELS")).toBe("all-levels");
    expect(opennessOf("INTERMEDIATE")).toBeNull();
    expect(opennessOf("ADVANCED")).toBeNull();
  });

  it("drops classes a beginner should not be sent to", () => {
    const ranked = rankClasses(
      [cls({ id: "ok" }), cls({ id: "nope", level: "ADVANCED" })],
      NO_ANSWERS,
    );
    expect(ranked.map((r) => r.id)).toEqual(["ok"]);
  });
});

describe("when", () => {
  it("matches a weekday evening", () => {
    const c = cls({ startTime: at(18, 19) }); // Wed 7pm
    expect(matchesWhen(c, ["weekday"])).toBe(true);
    expect(matchesWhen(c, ["lunch"])).toBe(false);
    expect(matchesWhen(c, ["weekend"])).toBe(false);
  });

  it("matches a weekday lunchtime", () => {
    const c = cls({ startTime: at(18, 12) }); // Wed noon
    expect(matchesWhen(c, ["lunch"])).toBe(true);
    expect(matchesWhen(c, ["weekday"])).toBe(false);
  });

  it("matches a weekend at any hour", () => {
    const sat = cls({ startTime: at(21, 10) }); // Sat 10am
    expect(matchesWhen(sat, ["weekend"])).toBe(true);
    expect(matchesWhen(sat, ["weekday"])).toBe(false);
  });

  it("reads the hour in the class's own zone, not the server's", () => {
    // 09:00 Sydney on the Wednesday is the previous evening in London, so a
    // naive UTC reading would call this a weekday evening.
    const c = cls({ startTime: at(18, 9), timezone: SYD });
    expect(matchesWhen(c, ["weekday"])).toBe(false);
  });

  it("treats no preference as no constraint", () => {
    expect(matchesWhen(cls(), [])).toBe(true);
  });
});

describe("where", () => {
  it("matches a suburb against the studio's city, either way round", () => {
    expect(matchesWhere(cls({ studioCity: "Sydney" }), "sydney")).toBe(true);
    expect(matchesWhere(cls({ studioCity: "Sydney" }), "Sydney CBD")).toBe(true);
    expect(matchesWhere(cls({ studioCity: "Melbourne" }), "Sydney")).toBe(false);
  });

  it("matches the class's own location text", () => {
    const c = cls({ studioCity: null, location: "214 Crown St, Surry Hills" });
    expect(matchesWhere(c, "Surry Hills")).toBe(true);
  });

  it("shows online classes wherever you are", () => {
    const c = cls({ format: "ONLINE", studioCity: null, location: null });
    expect(matchesWhere(c, "Perth")).toBe(true);
  });

  it("treats a blank suburb as no constraint", () => {
    expect(matchesWhere(cls({ studioCity: null, location: null }), "  ")).toBe(true);
  });
});

describe("music", () => {
  it("maps a taste onto the styles hosts actually file under", () => {
    expect(matchesMusic(cls({ style: "Salsa" }), "latin")).toBe(true);
    expect(matchesMusic(cls({ style: "Bachata" }), "latin")).toBe(true);
    expect(matchesMusic(cls({ style: "Ballet" }), "latin")).toBe(false);
    expect(matchesMusic(cls({ style: "Ballet" }), "classical")).toBe(true);
  });

  it("lets anything through for 'anything upbeat'", () => {
    expect(matchesMusic(cls({ style: "Ballet" }), "any")).toBe(true);
  });
});

describe("ranking", () => {
  it("puts a first-timer class above an all-levels one, all else equal", () => {
    const ranked = rankClasses(
      [
        cls({ id: "all", level: "ALL_LEVELS" }),
        cls({ id: "first", level: "BEGINNER" }),
      ],
      NO_ANSWERS,
    );
    expect(ranked[0].id).toBe("first");
  });

  it("rewards a class that matches the music picked", () => {
    const ranked = rankClasses(
      [cls({ id: "ballet", style: "Ballet" }), cls({ id: "salsa", style: "Salsa" })],
      { ...NO_ANSWERS, music: "latin" },
    );
    expect(ranked[0].id).toBe("salsa");
  });

  it("gives every reason it scored, and nothing it did not", () => {
    const [top] = rankClasses([cls({ style: "Salsa", studioCity: "Sydney" })], {
      goals: [],
      music: "latin",
      where: "Sydney",
      when: ["weekday"],
    });
    expect(top.reasons).toContain(
      "Salsa sits in the Latin & pop you picked.",
    );
    expect(top.reasons).toContain("Held in Sydney.");
    // No goals were picked, so no goal-derived reason should appear.
    expect(top.reasons.some((r) => r.includes("book for two"))).toBe(false);
  });

  it("only claims others are new when somebody really is", () => {
    const answers: Answers = { ...NO_ANSWERS, goals: ["confidence"] };
    // "never danced" also appears in the level reason, so match the claim
    // about other people specifically.
    const aboutOthers = (r: string) => /booked in (has|have) never danced/.test(r);

    const none = rankClasses([cls({ firstTimersBooked: 0 })], answers)[0];
    expect(none.reasons.some(aboutOthers)).toBe(false);

    const some = rankClasses([cls({ firstTimersBooked: 3 })], answers)[0];
    expect(some.reasons).toContain(
      "3 others booked in have never danced here either.",
    );
  });

  it("only offers a pair of seats when a pair is left", () => {
    const answers: Answers = { ...NO_ANSWERS, goals: ["date"] };
    const full = rankClasses([cls({ capacity: 10, seatsTaken: 9 })], answers)[0];
    expect(full.reasons.some((r) => r.includes("book for two"))).toBe(false);

    const roomy = rankClasses([cls({ capacity: 10, seatsTaken: 2 })], answers)[0];
    expect(roomy.reasons).toContain(
      "At least two seats left, so you can book for two.",
    );
  });
});

describe("answers round-trip through the URL", () => {
  it("survives being written out and read back", () => {
    const a: Answers = {
      goals: ["fun", "meet"],
      music: "hiphop",
      where: "Newtown",
      when: ["weekday", "weekend"],
    };
    const back = answersFromParams(
      Object.fromEntries(answersToParams(a).entries()),
    );
    expect(back).toEqual(a);
  });

  it("throws away anything it does not recognise", () => {
    const back = answersFromParams({
      goals: "fun,not-a-goal",
      music: "polka",
      when: "weekday,whenever",
    });
    expect(back.goals).toEqual(["fun"]);
    expect(back.music).toBeNull();
    expect(back.when).toEqual(["weekday"]);
  });
});
