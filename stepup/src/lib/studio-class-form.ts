/**
 * The studio's create-a-class form (flow v6.4): how it's listed, the level on
 * StepUp's scale, a description that starts from a template, partner rules,
 * a venue, room capacity and the spots StepUp may sell, a cancellation
 * preset, and the kids' class flag. One list of what's missing, used by the
 * form as you type and by the server before it saves anything.
 */
import { isMusic } from "@/lib/first-class";
import { isClockTime, isDay, isRepeat, type DayId, type RepeatId } from "@/lib/class-form";
import { isListing, MAX_COURSE_WEEKS, type Listing } from "@/lib/listing";
import { isScaleLevel } from "@/lib/levels";
import { isPartnerRule, type PartnerRule } from "@/lib/partner-roles";
import { isPolicy, type PolicyId } from "@/lib/policies";

export type StudioClassDraft = {
  listing: Listing;
  title: string;
  teacher: string;
  style: string;
  level: string;
  music: string;
  desc: string;
  weeks: string;
  termStart: string;
  coursePrice: string;
  partnerClass: boolean;
  rule: PartnerRule;
  leadCap: string;
  followCap: string;
  balanceX: string;
  day: DayId;
  time: string;
  dur: string;
  repeat: RepeatId;
  /** "studio" for the studio's own address, else a saved venue's id. */
  venue: string;
  cap: string;
  setAside: string;
  price: string;
  /** "studio" for the studio default, else a preset. */
  policy: "studio" | PolicyId;
  kids: boolean;
  wear: string;
  plan: string;
  promise: [boolean, boolean, boolean];
};

export const BLANK_STUDIO_CLASS: StudioClassDraft = {
  listing: "DROP_IN",
  title: "",
  teacher: "",
  style: "",
  level: "",
  music: "",
  desc: "",
  weeks: "8",
  termStart: "",
  coursePrice: "160",
  partnerClass: false,
  rule: "CAPS",
  leadCap: "8",
  followCap: "8",
  balanceX: "2",
  day: "Tue",
  time: "19:00",
  dur: "60",
  repeat: "weekly",
  venue: "studio",
  cap: "20",
  setAside: "6",
  price: "25",
  policy: "studio",
  kids: false,
  wear: "",
  plan: "",
  promise: [false, false, false],
};

export const STUDIO_CLASS_PROMISES = [
  "Our teachers assume nobody in the room has danced before.",
  "Nobody needs to bring a partner, unless it’s a partner class with roles.",
  "Someone meets first-timers at the door and learns their names.",
] as const;

export const DESC_MAX = 600;

const whole = (v: string) => (/^\d+$/.test(String(v ?? "").trim()) ? Number(v) : null);

export function studioClassProblems(
  d: StudioClassDraft,
  ctx: { teacherWwccOk: boolean; today: string; canCharge: boolean },
): string[] {
  const out: string[] = [];
  const t = d.title.trim();
  if (t.length < 3 || t.length > 80) out.push("a class name");
  if (!d.teacher) out.push("a teacher");
  if (!d.style.trim()) out.push("a style");
  if (!isScaleLevel(d.level)) out.push("a level");
  if (!isMusic(d.music)) out.push("the music");
  if (!isClockTime(d.time)) out.push("a start time");
  if (d.desc.length > DESC_MAX) out.push("a shorter description");

  const cap = whole(d.cap);
  const aside = whole(d.setAside);
  if (cap === null || cap < 2 || cap > 80) out.push("the room capacity");
  if (aside === null || aside < 1 || (cap !== null && aside > cap)) out.push("StepUp spots (up to the room capacity)");

  if (d.listing === "COURSE") {
    const weeks = whole(d.weeks);
    const price = whole(d.coursePrice);
    if (
      weeks === null || weeks < 2 || weeks > MAX_COURSE_WEEKS ||
      !/^\d{4}-\d{2}-\d{2}$/.test(d.termStart) || d.termStart <= ctx.today ||
      price === null || price <= 0 || price > 5000
    ) {
      out.push("course length, a future start date and a price");
    } else if (!ctx.canCharge) {
      out.push("payouts set up (courses are paid)");
    }
  }
  if (d.listing === "DROP_IN") {
    const price = whole(d.price);
    if (price === null || price > 500) out.push("a drop-in price");
    else if (price > 0 && !ctx.canCharge) out.push("payouts set up, or a $0 price");
  }
  if (d.partnerClass && d.rule === "CAPS") {
    const l = whole(d.leadCap);
    const f = whole(d.followCap);
    if (l === null || f === null || l < 1 || f < 1 || (cap !== null && l + f > cap)) {
      out.push("lead and follow caps that fit the room");
    }
  }
  if (d.partnerClass && d.rule === "BALANCE") {
    const x = whole(d.balanceX);
    if (x === null || x > 10) out.push("how many extra on either side (0 to 10)");
  }
  if (d.kids && !ctx.teacherWwccOk) out.push("a verified Working With Children Check for the teacher");
  if (d.listing !== "HIDDEN" && !d.promise.every(Boolean)) out.push("the First Timer promise");
  return out;
}

export function studioDraftFromForm(get: (k: string) => string | null): StudioClassDraft {
  const s = (k: string) => get(k) ?? "";
  const listing = s("listing");
  const day = s("day");
  const repeat = s("repeat");
  const rule = s("rule");
  const policy = s("policy");
  return {
    listing: isListing(listing) ? listing : "DROP_IN",
    title: s("title"),
    teacher: s("teacher"),
    style: s("style"),
    level: s("level"),
    music: s("music"),
    desc: s("desc"),
    weeks: s("weeks"),
    termStart: s("termStart"),
    coursePrice: s("coursePrice"),
    partnerClass: s("partnerClass") === "on",
    rule: isPartnerRule(rule) ? rule : "CAPS",
    leadCap: s("leadCap"),
    followCap: s("followCap"),
    balanceX: s("balanceX"),
    day: isDay(day) ? day : "Tue",
    time: s("time"),
    dur: s("dur") || "60",
    repeat: isRepeat(repeat) ? repeat : "weekly",
    venue: s("venue") || "studio",
    cap: s("cap"),
    setAside: s("setAside"),
    price: s("price"),
    policy: isPolicy(policy) ? policy : "studio",
    kids: s("kids") === "on",
    wear: s("wear"),
    plan: s("plan"),
    promise: [get("promise0") === "on", get("promise1") === "on", get("promise2") === "on"],
  };
}

export function studioDraftToFormData(d: StudioClassDraft): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(d)) {
    if (k === "promise") continue;
    if (typeof v === "boolean") {
      if (v) fd.set(k, "on");
    } else fd.set(k, String(v));
  }
  d.promise.forEach((on, i) => on && fd.set(`promise${i}`, "on"));
  return fd;
}
