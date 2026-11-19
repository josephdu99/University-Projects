import { createHmac } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { checkClassList, checkUnsubscribe, classListPath, unsubscribePath } from "@/lib/signed-links";
import { cutoffLabel, cutoffSentence } from "@/lib/policy-copy";
import { studioClassProblems, BLANK_STUDIO_CLASS } from "@/lib/studio-class-form";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-for-signed-links";
});

function params(path: string) {
  return new URL(path, "https://x.test").searchParams;
}

describe("signed links", () => {
  it("unsubscribe links check out only for the user and studio they were made for", () => {
    const q = params(unsubscribePath("user1", "studio1"));
    expect(checkUnsubscribe(q.get("u")!, q.get("s")!, q.get("sig")!)).toBe(true);
    expect(checkUnsubscribe("user2", q.get("s")!, q.get("sig")!)).toBe(false);
    expect(checkUnsubscribe(q.get("u")!, "studio2", q.get("sig")!)).toBe(false);
    expect(checkUnsubscribe(q.get("u")!, q.get("s")!, "")).toBe(false);
  });

  it("class list links work until the day after class, for that teacher only", () => {
    const start = new Date("2026-11-20T08:00:00Z");
    const q = params(classListPath("class1", "member1", start));
    const [m, e, sig] = [q.get("m")!, q.get("e")!, q.get("sig")!];
    expect(checkClassList("class1", m, e, sig, start.getTime())).toBe(true);
    expect(checkClassList("class1", m, e, sig, start.getTime() + 25 * 3600_000)).toBe(false);
    expect(checkClassList("class2", m, e, sig, start.getTime())).toBe(false);
    expect(checkClassList("class1", "member2", e, sig, start.getTime())).toBe(false);
    // Pushing the expiry out breaks the signature.
    expect(checkClassList("class1", m, String(Number(e) + 1), sig, start.getTime())).toBe(false);
  });
});

describe("Twilio signature", () => {
  it("accepts Twilio's own scheme and nothing else", async () => {
    process.env.DATABASE_URL ??= "postgresql://x@localhost/x";
    const { validTwilioSignature } = await import("@/lib/text-inbound");
    const url = "https://stepup.test/api/sms/inbound";
    const fields = { From: "+61412345678", Body: "cancel thu salsa", To: "+61480000123" };
    const data = url + Object.keys(fields).sort().map((k) => k + fields[k as keyof typeof fields]).join("");
    const sig = createHmac("sha1", "tok").update(data).digest("base64");
    expect(validTwilioSignature(url, fields, sig, "tok")).toBe(true);
    expect(validTwilioSignature(url, { ...fields, Body: "cancel fri salsa" }, sig, "tok")).toBe(false);
    expect(validTwilioSignature(url, fields, sig, "other")).toBe(false);
  });
});

describe("policy copy", () => {
  it("names the exact cut-off in the class's own zone", () => {
    // 7pm Sydney on Fri 20 Nov 2026 (AEDT, UTC+11).
    const start = new Date("2026-11-20T08:00:00Z");
    expect(cutoffLabel(start, "Australia/Sydney", "STANDARD")).toBe("7:00am Fri 20 Nov");
    expect(cutoffLabel(start, "Australia/Sydney", "STRICT")).toBe("7:00pm Thu 19 Nov");
    expect(cutoffSentence(start, "Australia/Sydney", "RELAXED")).toBe(
      "Free cancellation until 5:00pm Fri 20 Nov (2 hours before class). After that, there's no refund.",
    );
  });
});

describe("create a class (v6.4)", () => {
  const ctx = { teacherWwccOk: false, today: "2026-11-19", canCharge: true };
  const ok = {
    ...BLANK_STUDIO_CLASS,
    title: "Salsa Foundations",
    teacher: "m1",
    style: "Salsa",
    level: "BEGINNER",
    music: "latin",
    promise: [true, true, true] as [boolean, boolean, boolean],
  };

  it("a complete drop-in class has nothing missing", () => {
    expect(studioClassProblems(ok, ctx)).toEqual([]);
  });

  it("a kids' class needs the teacher's verified check", () => {
    expect(studioClassProblems({ ...ok, kids: true }, ctx)).toContain("a verified Working With Children Check for the teacher");
    expect(studioClassProblems({ ...ok, kids: true }, { ...ctx, teacherWwccOk: true })).toEqual([]);
  });

  it("StepUp spots can't exceed the room, and caps must fit it", () => {
    expect(studioClassProblems({ ...ok, cap: "10", setAside: "12" }, ctx)).toContain("StepUp spots (up to the room capacity)");
    expect(studioClassProblems({ ...ok, partnerClass: true, rule: "CAPS", leadCap: "8", followCap: "8", cap: "12", setAside: "6" }, ctx)).toContain(
      "lead and follow caps that fit the room",
    );
  });

  it("a course needs a future start, and payouts when it's paid", () => {
    const course = { ...ok, listing: "COURSE" as const, weeks: "8", coursePrice: "160", termStart: "2026-12-01" };
    expect(studioClassProblems(course, ctx)).toEqual([]);
    expect(studioClassProblems({ ...course, termStart: "2026-11-01" }, ctx)).toContain("course length, a future start date and a price");
    expect(studioClassProblems(course, { ...ctx, canCharge: false })).toContain("payouts set up (courses are paid)");
  });

  it("a class kept off StepUp doesn't need the First Timer promise", () => {
    expect(studioClassProblems({ ...ok, listing: "HIDDEN", promise: [false, false, false] }, ctx)).toEqual([]);
  });
});
