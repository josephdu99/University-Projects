import { describe, expect, it } from "vitest";
import { abnDigits, formatAbn, isValidAbn } from "@/lib/abn";
import {
  invitePrefix,
  isAuMobile,
  looksLikeInviteCode,
  makeInviteCode,
  normaliseInviteCode,
  parseContact,
} from "@/lib/team";
import {
  BLANK_CLASS,
  classProblems,
  draftFromForm,
  formatClock,
  type ClassDraft,
} from "@/lib/class-form";
import { firstSessionDate, sessionDates, sessionStarts } from "@/lib/class-schedule";
import { sniffImageType } from "@/lib/image-type";

describe("ABN checksum", () => {
  it("accepts real ABNs, with or without spaces", () => {
    // The Australian Business Register's worked example.
    expect(isValidAbn("51 824 753 556")).toBe(true);
    expect(isValidAbn("51824753556")).toBe(true);
    expect(isValidAbn("51 824 753 556 ")).toBe(true);
  });

  it("rejects a single wrong digit, a swap, and the wrong length", () => {
    expect(isValidAbn("51 824 753 557")).toBe(false);
    expect(isValidAbn("15 824 753 556")).toBe(false);
    expect(isValidAbn("5182475355")).toBe(false);
    expect(isValidAbn("518247535561")).toBe(false);
    expect(isValidAbn("")).toBe(false);
  });

  it("formats the way the register prints them", () => {
    expect(abnDigits("51-824-753-556")).toBe("51824753556");
    expect(formatAbn("51824753556")).toBe("51 824 753 556");
  });
});

describe("invite contacts", () => {
  it("knows an Australian mobile in its usual spellings", () => {
    for (const v of ["0412 345 678", "0412345678", "+61 412 345 678", "61412345678", "(04) 1234-5678"]) {
      expect(isAuMobile(v)).toBe(true);
    }
    expect(isAuMobile("02 9876 5432")).toBe(false);
    expect(isAuMobile("0412 345 67")).toBe(false);
  });

  it("tidies emails and mobiles, and refuses anything else", () => {
    expect(parseContact(" Maya@Email.COM ")).toEqual({ kind: "email", value: "maya@email.com" });
    expect(parseContact("+61412345678")).toEqual({ kind: "mobile", value: "0412 345 678" });
    expect(parseContact("maya")).toBeNull();
  });
});

describe("invite codes", () => {
  it("drop filler words from the studio name", () => {
    expect(invitePrefix("Ritmo Dance Studio")).toBe("RITMO");
    expect(invitePrefix("The Rhythm Room")).toBe("RHYTHM");
    expect(invitePrefix("Dance Studio")).toBe("STUDIO");
  });

  it("are the prefix and six unambiguous characters", () => {
    const code = makeInviteCode("Ritmo Dance Studio", (n) => new Uint8Array(n).fill(0));
    expect(code).toBe("RITMO-AAAAAA");
    const random = makeInviteCode("Ritmo");
    expect(random).toMatch(/^RITMO-[A-HJ-NP-Z2-9]{6}$/);
    expect(looksLikeInviteCode(random)).toBe(true);
  });

  it("are read back from what people paste", () => {
    expect(normaliseInviteCode(" ritmo-7k3qxm ")).toBe("RITMO-7K3QXM");
    expect(normaliseInviteCode("https://stepup.app/join/RITMO-7K3QXM")).toBe("RITMO-7K3QXM");
    expect(looksLikeInviteCode("hello")).toBe(false);
  });
});

const good: ClassDraft = {
  ...BLANK_CLASS,
  title: "Salsa Foundations",
  teacher: "m1",
  style: "Salsa",
  music: "latin",
  promise: [true, true, true],
};

describe("the class form's checks", () => {
  it("passes a complete studio class", () => {
    expect(classProblems(good, "studio")).toEqual([]);
  });

  it("names what is missing, in order", () => {
    expect(classProblems(BLANK_CLASS, "studio")).toEqual([
      "a class name",
      "a teacher",
      "a style",
      "the music",
      "the First Timer promise",
    ]);
  });

  it("keeps first-timer spots within the class size", () => {
    expect(classProblems({ ...good, cap: "4", newSpots: "6" }, "studio")).toEqual([
      "first-timer spots (up to the class size)",
    ]);
    expect(classProblems({ ...good, cap: "1" }, "studio")).toContain("a class size (2 to 80)");
  });

  it("needs a place for an independent class, and no teacher", () => {
    const solo = { ...good, teacher: "" };
    expect(classProblems(solo, "independent")).toEqual(["a suburb from the list", "the address"]);
    expect(
      classProblems({ ...solo, suburb: "newtown", address: "1 King St" }, "independent"),
    ).toEqual([]);
  });

  it("reads ticked promise boxes back from a form", () => {
    const f = new Map(Object.entries({ title: "X", promise0: "on", promise2: "on", day: "Fri", repeat: "nope" }));
    const d = draftFromForm((k) => f.get(k) ?? null);
    expect(d.promise).toEqual([true, false, true]);
    expect(d.day).toBe("Fri");
    expect(d.repeat).toBe("weekly");
  });

  it("writes times the way the cards do", () => {
    expect(formatClock("19:00")).toBe("7:00pm");
    expect(formatClock("00:30")).toBe("12:30am");
    expect(formatClock("12:05")).toBe("12:05pm");
  });
});

describe("scheduling", () => {
  // Tuesday 17 November 2026, 10am in Sydney.
  const tueMorning = new Date("2026-11-16T23:00:00Z");

  it("starts today when the class is still ahead, else next week", () => {
    expect(firstSessionDate(tueMorning, "Tue", "19:00", "Australia/Sydney")).toBe("2026-11-17");
    expect(firstSessionDate(tueMorning, "Tue", "09:00", "Australia/Sydney")).toBe("2026-11-24");
    expect(firstSessionDate(tueMorning, "Mon", "19:00", "Australia/Sydney")).toBe("2026-11-23");
    expect(firstSessionDate(tueMorning, "Sat", "10:00", "Australia/Sydney")).toBe("2026-11-21");
  });

  it("fills twelve weeks, weekly or fortnightly", () => {
    expect(sessionDates("2026-11-18", "once")).toEqual(["2026-11-18"]);
    const weekly = sessionDates("2026-11-18", "weekly");
    expect(weekly).toHaveLength(12);
    expect(weekly[1]).toBe("2026-11-25");
    const fortnightly = sessionDates("2026-11-18", "fortnightly");
    expect(fortnightly).toHaveLength(6);
    expect(fortnightly[1]).toBe("2026-12-02");
  });

  it("keeps the wall-clock time across daylight saving", () => {
    // Sydney leaves daylight saving on 4 April 2027.
    const starts = sessionStarts(new Date("2027-03-20T00:00:00Z"), "Wed", "19:00", "weekly", "Australia/Sydney");
    expect(starts[0].toISOString()).toBe("2027-03-24T08:00:00.000Z");
    expect(starts[2].toISOString()).toBe("2027-04-07T09:00:00.000Z");
  });
});

describe("uploaded photos", () => {
  it("are judged by their bytes, not their name", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
    expect(sniffImageType(webp)).toBe("image/webp");
    expect(sniffImageType(new TextEncoder().encode("<svg xmlns="))).toBeNull();
  });
});

import { seatsForRegulars } from "@/lib/first-timer-spots";

describe("first-timer spots", () => {
  it("keep seats from regulars until first-timers take them", () => {
    expect(seatsForRegulars(16, 6, 0)).toBe(10);
    expect(seatsForRegulars(16, 6, 2)).toBe(12);
    expect(seatsForRegulars(16, 6, 6)).toBe(16);
    expect(seatsForRegulars(16, 6, 9)).toBe(16);
  });

  it("change nothing when the host keeps none, and never exceed the class", () => {
    expect(seatsForRegulars(16, null, 0)).toBe(16);
    expect(seatsForRegulars(16, 0, 0)).toBe(16);
    expect(seatsForRegulars(4, 6, 0)).toBe(0);
  });
});
