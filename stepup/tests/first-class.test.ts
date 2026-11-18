import { describe, it, expect } from "vitest";
import {
  rankClasses,
  matchesWhen,
  matchesMusic,
  nearness,
  outOfReach,
  questionsDone,
  slotOf,
  opennessOf,
  answersFromParams,
  answersToParams,
  answersFromStored,
  answerChips,
  EMPTY_ANSWERS,
  type Answers,
  type CandidateClass,
} from "@/lib/first-class";

const SYD = "Australia/Sydney";

/** A Sydney wall-clock time; 2026-11-18 is a Wednesday. */
function at(day: number, hour: number): Date {
  return new Date(
    `2026-11-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00+11:00`,
  );
}

function cls(over: Partial<CandidateClass> = {}): CandidateClass {
  return {
    id: "c1",
    title: "Salsa Foundations",
    style: "Salsa",
    level: "BEGINNER",
    format: "IN_PERSON",
    location: null,
    startTime: at(18, 19),
    timezone: SYD,
    durationMin: 60,
    capacity: 20,
    priceCents: 0,
    currency: "aud",
    seatsTaken: 0,
    firstTimersBooked: 0,
    studioName: "Ritmo",
    studioCity: "Sydney",
    suburb: "Surry Hills",
    hostName: "Maya",
    ...over,
  };
}

const A = (over: Partial<Answers> = {}): Answers => ({ ...EMPTY_ANSWERS, ...over });

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
      EMPTY_ANSWERS,
    );
    expect(ranked.map((r) => r.id)).toEqual(["ok"]);
  });
});

describe("time slots", () => {
  it("reads the slot in the class's own timezone", () => {
    expect(slotOf(cls({ startTime: at(18, 19) }))).toBe("weekday"); // Wed 7pm
    expect(slotOf(cls({ startTime: at(18, 12) }))).toBe("lunch"); // Wed noon
    expect(slotOf(cls({ startTime: at(21, 10) }))).toBe("weekend"); // Sat 10am
    expect(slotOf(cls({ startTime: at(18, 9) }))).toBeNull(); // Wed 9am
  });

  it("does not mistake a Sydney morning for an evening somewhere else", () => {
    // 9am Wednesday in Sydney is 10pm Tuesday UTC; read naively, that is a
    // weekday evening.
    expect(matchesWhen(cls({ startTime: at(18, 9) }), ["weekday"])).toBe(false);
  });

  it("treats no slots picked as no constraint", () => {
    expect(matchesWhen(cls(), [])).toBe(true);
  });
});

describe("music", () => {
  it("maps a taste onto the styles hosts actually file under", () => {
    expect(matchesMusic(cls({ style: "Salsa" }), "latin")).toBe(true);
    expect(matchesMusic(cls({ style: "Bachata" }), "latin")).toBe(true);
    expect(matchesMusic(cls({ style: "Ballet" }), "latin")).toBe(false);
    expect(matchesMusic(cls({ style: "Ballet" }), "classical")).toBe(true);
  });

  it("reads 'anything upbeat' as upbeat, not as everything", () => {
    expect(matchesMusic(cls({ style: "Salsa" }), "any")).toBe(true);
    expect(matchesMusic(cls({ style: "Hip Hop" }), "any")).toBe(true);
    expect(matchesMusic(cls({ style: "Afrobeats" }), "any")).toBe(true);
    expect(matchesMusic(cls({ style: "Ballet" }), "any")).toBe(false);
  });

  it("matches nothing before a taste is picked", () => {
    expect(matchesMusic(cls(), null)).toBe(false);
  });
});

describe("nearness", () => {
  it("is 1 in the picked suburb and 0.5 in the same area", () => {
    expect(nearness(cls({ suburb: "Newtown" }), "Newtown")).toBe(1);
    // Marrickville and Newtown are both Inner West.
    expect(nearness(cls({ suburb: "Newtown" }), "Marrickville")).toBe(0.5);
    // Bondi is in the Eastern Suburbs.
    expect(nearness(cls({ suburb: "Newtown" }), "Bondi")).toBe(0);
  });

  it("is 0 when either side is not a known suburb", () => {
    expect(nearness(cls({ suburb: null }), "Newtown")).toBe(0);
    expect(nearness(cls({ suburb: "Newtown" }), "")).toBe(0);
    expect(nearness(cls({ suburb: "Newtown" }), "Newt")).toBe(0);
  });
});

describe("reach", () => {
  const melbourne = cls({ suburb: null, studioCity: "Melbourne", timezone: "Australia/Melbourne" });

  it("hides an in-person class in another city once a suburb is picked", () => {
    expect(outOfReach(melbourne, "Newtown")).toBe(true);
    expect(rankClasses([melbourne], A({ where: "Newtown" }))).toEqual([]);
  });

  it("hides nothing before a suburb is picked", () => {
    expect(outOfReach(melbourne, "")).toBe(false);
    expect(rankClasses([melbourne], EMPTY_ANSWERS)).toHaveLength(1);
  });

  it("never hides an online class", () => {
    const online = cls({ format: "ONLINE", suburb: null, studioCity: null, timezone: "Australia/Melbourne" });
    expect(outOfReach(online, "Newtown")).toBe(false);
  });

  it("keeps a Sydney class whose address names no suburb", () => {
    const vague = cls({ suburb: null, studioCity: "Sydney" });
    expect(outOfReach(vague, "Newtown")).toBe(false);
  });
});

describe("questionsDone", () => {
  it("counts each question once it has a real answer", () => {
    expect(questionsDone(EMPTY_ANSWERS)).toEqual([false, false, false]);
    expect(questionsDone(A({ goals: ["fun"] }))).toEqual([true, false, false]);
    expect(questionsDone(A({ music: "latin" }))).toEqual([false, true, false]);
  });

  it("needs a picked suburb and a time slot for the third", () => {
    expect(questionsDone(A({ where: "Newtown" }))[2]).toBe(false);
    expect(questionsDone(A({ when: ["weekday"] }))[2]).toBe(false);
    expect(questionsDone(A({ where: "Newt", when: ["weekday"] }))[2]).toBe(false);
    expect(questionsDone(A({ where: "Newtown", when: ["weekday"] }))[2]).toBe(true);
  });
});

describe("ranking, with the handoff's scoring", () => {
  it("scores +2 music, +1 time slot, +1 same suburb", () => {
    const [top] = rankClasses([cls({ style: "Salsa", suburb: "Newtown", startTime: at(18, 19) })], {
      goals: [],
      music: "latin",
      where: "Newtown",
      when: ["weekday"],
    });
    expect(top.score).toBe(4);
  });

  it("scores +0.5 for the same area instead of the same suburb", () => {
    const [top] = rankClasses([cls({ suburb: "Newtown" })], A({ where: "Marrickville" }));
    expect(top.score).toBe(0.5);
  });

  it("only scores a time slot the dancer picked", () => {
    const [top] = rankClasses([cls({ startTime: at(18, 19) })], A({ when: ["weekend"] }));
    expect(top.score).toBe(0);
  });

  it("weighs music the same as time slot and suburb together", () => {
    const ranked = rankClasses(
      [
        cls({ id: "near", style: "Ballet", suburb: "Newtown", startTime: at(18, 19) }),
        cls({ id: "music", style: "Salsa", suburb: "Bondi", startTime: at(18, 9) }),
      ],
      { goals: [], music: "latin", where: "Newtown", when: ["weekday"] },
    );
    // music: 2. near: 1 (suburb) + 1 (slot) = 2. A tie on score; both are
    // First Timer classes, so the sooner one, 9am, goes first.
    expect(ranked.map((r) => r.score)).toEqual([2, 2]);
    expect(ranked[0].id).toBe("music");
  });

  it("breaks ties with a First Timer class over an all-levels one", () => {
    const ranked = rankClasses(
      [cls({ id: "all", level: "ALL_LEVELS" }), cls({ id: "first", level: "BEGINNER" })],
      EMPTY_ANSWERS,
    );
    expect(ranked[0].id).toBe("first");
  });

  it("then with the sooner class", () => {
    const ranked = rankClasses(
      [cls({ id: "later", startTime: at(25, 19) }), cls({ id: "sooner", startTime: at(19, 19) })],
      EMPTY_ANSWERS,
    );
    expect(ranked[0].id).toBe("sooner");
  });

  it("re-ranks when the answers change", () => {
    const pool = [
      cls({ id: "salsa", style: "Salsa" }),
      cls({ id: "ballet", style: "Ballet", startTime: at(25, 19) }),
    ];
    expect(rankClasses(pool, A({ music: "latin" }))[0].id).toBe("salsa");
    expect(rankClasses(pool, A({ music: "classical" }))[0].id).toBe("ballet");
  });

  it("lets goals add reasons but never move the ranking", () => {
    const pool = [cls({ id: "a" }), cls({ id: "b", format: "ONLINE", startTime: at(19, 19) })];
    const plain = rankClasses(pool, EMPTY_ANSWERS).map((r) => r.id);
    const withGoals = rankClasses(pool, A({ goals: ["meet", "fitness"] })).map((r) => r.id);
    expect(withGoals).toEqual(plain);
  });
});

describe("reasons", () => {
  it("names each fact that scored, and nothing that did not", () => {
    const [top] = rankClasses([cls({ style: "Salsa", suburb: "Newtown" })], {
      goals: [],
      music: "latin",
      where: "Newtown",
      when: ["weekday"],
    });
    expect(top.reasons).toContain("Salsa sits in the Latin & pop you picked.");
    expect(top.reasons).toContain("On a weekday evening, after work.");
    expect(top.reasons).toContain("In Newtown, where you said.");
    expect(top.reasons.some((r) => r.includes("book for two"))).toBe(false);
  });

  it("says which suburb an area match is in", () => {
    const [top] = rankClasses([cls({ suburb: "Newtown" })], A({ where: "Marrickville" }));
    expect(top.reasons).toContain("In Newtown, the same part of Sydney as Marrickville.");
  });

  it("only claims others are new when somebody really is", () => {
    const aboutOthers = (r: string) => /booked in (has|have) never danced/.test(r);
    const answers = A({ goals: ["confidence"] });
    expect(rankClasses([cls({ firstTimersBooked: 0 })], answers)[0].reasons.some(aboutOthers)).toBe(false);
    expect(rankClasses([cls({ firstTimersBooked: 3 })], answers)[0].reasons).toContain(
      "3 others booked in have never danced here either.",
    );
  });

  it("only offers a pair of seats when a pair is left", () => {
    const answers = A({ goals: ["date"] });
    const full = rankClasses([cls({ capacity: 10, seatsTaken: 9 })], answers)[0];
    expect(full.reasons.some((r) => r.includes("book for two"))).toBe(false);
    const roomy = rankClasses([cls({ capacity: 10, seatsTaken: 2 })], answers)[0];
    expect(roomy.reasons).toContain("At least two seats left, so you can book for two.");
  });

  it("leads with what the dancer answered, not with the level", () => {
    const [top] = rankClasses([cls()], A({ music: "latin" }));
    expect(top.reasons[0]).toContain("you picked");
  });
});

describe("answers in and out", () => {
  it("shows a chip only for a suburb that was actually picked", () => {
    expect(answerChips(A({ where: "Newtown" }))).toEqual(["Newtown"]);
    expect(answerChips(A({ where: "Newt" }))).toEqual([]);
  });

  it("survive being written to a URL and read back", () => {
    const a: Answers = { goals: ["fun", "meet"], music: "hiphop", where: "Newtown", when: ["weekday", "weekend"] };
    expect(answersFromParams(Object.fromEntries(answersToParams(a).entries()))).toEqual(a);
  });

  it("throw away anything from a URL they do not recognise", () => {
    const back = answersFromParams({ goals: "fun,not-a-goal,fun", music: "polka", where: "Atlantis", when: "weekday,whenever" });
    expect(back).toEqual({ goals: ["fun"], music: null, where: "", when: ["weekday"] });
  });

  it("read back the stored shape, and nothing else", () => {
    expect(answersFromStored({ goals: ["fun"], music: "latin", where: "newtown", when: ["lunch"] })).toEqual({
      goals: ["fun"],
      music: "latin",
      where: "Newtown",
      when: ["lunch"],
    });
    expect(answersFromStored(null)).toEqual(EMPTY_ANSWERS);
    expect(answersFromStored("nonsense")).toEqual(EMPTY_ANSWERS);
    expect(answersFromStored({ goals: "fun", music: 7, where: ["x"], when: [1, "weekend"] })).toEqual({
      goals: [],
      music: null,
      where: "",
      when: ["weekend"],
    });
  });
});
