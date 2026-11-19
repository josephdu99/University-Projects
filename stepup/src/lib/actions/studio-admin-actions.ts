"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { canRunClass, getStudioAccess, studioPerms } from "@/lib/studio-access";
import { setAttendance, addWalkIn, type Mark } from "@/lib/attendance";
import { sendSms, smsConfigured } from "@/lib/sms";
import { sendClassMessage, sendCourseOpen, sendPassOffer, sendVenueChanged } from "@/lib/email-studio";
import { appUrl } from "@/lib/email";
import { unsubscribePath } from "@/lib/signed-links";
import { studioClassProblems, studioDraftFromForm } from "@/lib/studio-class-form";
import { createStudioClass } from "@/lib/studio-classes";
import { DANCE_STYLES, formatClock } from "@/lib/class-form";
import { isPolicy } from "@/lib/policies";
import { isScaleLevel } from "@/lib/levels";
import { isWwccNumber, normaliseWwcc, wwccCurrent } from "@/lib/wwcc";
import { saveUploadedImage } from "@/lib/images";
import { saveUploadedPdf } from "@/lib/documents";
import { formatClassWhen, formatClassWhenLong, dateKeyInTimeZone } from "@/lib/time";
import { suburbFromAddress, findSuburb } from "@/lib/suburbs";
import { checkRateLimit } from "@/lib/rate-limit";
import { setStripePayoutDay } from "@/lib/stripe";
import { logError } from "@/lib/logger";
import { PAYOUT_DAYS } from "@/lib/studio-data";

export type Result = { ok: true; message: string } | { ok: false; error: string } | undefined;

async function actor() {
  const user = await getSessionUser();
  if (!user) return null;
  const access = await getStudioAccess(user.id);
  if (!access) return null;
  return { user, ...access, perms: studioPerms(access) };
}

function done(message: string, paths: string[] = ["/studio"]): Result {
  for (const p of paths) revalidatePath(p);
  return { ok: true, message };
}

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

// ─── Class sheet: attendance, walk-ins, messages, move, cancel ──────────────

async function classForRunning(classId: string) {
  const user = await getSessionUser();
  if (!user) return null;
  const c = await db.danceClass.findUnique({
    where: { id: classId },
    select: {
      id: true,
      title: true,
      startTime: true,
      timezone: true,
      hostId: true,
      studioId: true,
      seriesId: true,
      teacherMemberId: true,
      cancelledAt: true,
      studio: { select: { name: true, address: true, city: true, owner: { select: { email: true } } } },
      host: { select: { name: true, displayName: true, email: true } },
    },
  });
  if (!c || !(await canRunClass(user, c))) return null;
  return { user, c };
}

export async function markAttendanceAction(bookingId: string, mark: Mark): Promise<Result> {
  const booking = await db.booking.findUnique({ where: { id: bookingId }, select: { classId: true } });
  if (!booking) return { ok: false, error: "Booking not found." };
  const ctx = await classForRunning(booking.classId);
  if (!ctx) return { ok: false, error: "You can't change this class list." };
  const r = await setAttendance(bookingId, mark);
  if (!r.ok) return { ok: false, error: r.error ?? "Couldn't save that." };
  return done("Saved.", ["/studio", `/class-list/${booking.classId}`]);
}

export async function addWalkInAction(classId: string, formData: FormData): Promise<Result> {
  const ctx = await classForRunning(classId);
  if (!ctx) return { ok: false, error: "You can't change this class list." };
  const name = str(formData, "name").trim();
  const r = await addWalkIn(classId, name, str(formData, "role") || null);
  if (!r.ok) return { ok: false, error: r.error };
  return done(
    `${name} added as a walk-in.${r.promoted ? ` ${r.promoted} ${r.promoted === 1 ? "person" : "people"} came off the waitlist.` : ""}`,
    ["/studio", `/class-list/${classId}`],
  );
}

export async function removeWalkInAction(walkInId: string): Promise<Result> {
  const w = await db.walkIn.findUnique({ where: { id: walkInId }, select: { classId: true } });
  if (!w) return { ok: false, error: "Not found." };
  if (!(await classForRunning(w.classId))) return { ok: false, error: "You can't change this class list." };
  await db.walkIn.delete({ where: { id: walkInId } });
  return done("Walk-in removed.", ["/studio", `/class-list/${w.classId}`]);
}

/**
 * "Message class": everyone booked, by email and (once StepUp's number is set
 * up) SMS, from StepUp rather than the teacher's own number. Kept with the
 * class so managers can see what was sent.
 */
export async function messageClassAction(classId: string, formData: FormData): Promise<Result> {
  const ctx = await classForRunning(classId);
  if (!ctx) return { ok: false, error: "You can't message this class." };
  const body = str(formData, "body").trim();
  if (!body) return { ok: false, error: "Write a message first." };
  if (body.length > 320) return { ok: false, error: "Keep it to 320 characters." };
  const limit = await checkRateLimit(`class-msg:${classId}`, 10, 24 * 60 * 60_000);
  if (!limit.allowed) return { ok: false, error: "That's a lot of messages for one class today." };
  return sendToClass(ctx.c, ctx.user.id, body);
}

export async function sendToClass(
  c: { id: string; title: string; startTime: Date; timezone: string; studio: { name: string; owner: { email: string } } | null; host: { name: string; displayName: string | null; email: string } },
  senderId: string,
  body: string,
): Promise<Result> {
  const booked = await db.booking.findMany({
    where: { classId: c.id, status: { in: ["BOOKED", "PENDING_PAYMENT"] } },
    select: { user: { select: { email: true, name: true, phone: true } } },
  });
  const hostName = c.studio?.name ?? (c.host.displayName?.trim() || c.host.name);
  const sms = smsConfigured();
  for (const b of booked) {
    if (b.user.email) {
      await sendClassMessage({
        to: b.user.email,
        name: b.user.name,
        hostName,
        classTitle: c.title,
        startTime: c.startTime,
        timezone: c.timezone,
        body,
        replyTo: c.studio?.owner.email ?? c.host.email,
      }).catch((err) => logError("email.classMessage", err));
    }
    if (sms) await sendSms(b.user.phone, `${hostName}, ${c.title}: ${body}`).catch(() => false);
  }
  await db.classMessage.create({
    data: { classId: c.id, senderId, body, recipients: booked.length, channels: sms ? "SMS_EMAIL" : "EMAIL" },
  });
  const n = `${booked.length} ${booked.length === 1 ? "student" : "students"}`;
  return done(`Message sent to ${n} by ${sms ? "SMS and email" : "email"}.`, ["/studio", `/class-list/${c.id}`]);
}

/** Resolve a venue choice ("studio" or a saved venue's id) for a studio. */
async function venueFor(studio: { id: string; name: string; address: string; city: string; suburb: string | null }, choice: string) {
  if (choice === "studio" || !choice) {
    return {
      id: null,
      name: studio.name,
      location: `${studio.address}, ${studio.city}`,
      suburb: findSuburb(studio.suburb)?.name ?? suburbFromAddress(studio.address)?.name ?? null,
    };
  }
  const v = await db.venue.findFirst({ where: { id: choice, studioId: studio.id } });
  if (!v) return null;
  return { id: v.id, name: v.name, location: v.address, suburb: v.suburb ?? suburbFromAddress(v.address)?.name ?? null };
}

/**
 * Move one class, or this and every later class in its series, keeping the
 * bookings. Everyone booked is told, and may cancel free (venueChangedAt).
 */
export async function moveClassAction(classId: string, formData: FormData): Promise<Result> {
  const a = await actor();
  if (!a) return { ok: false, error: "Only the people who run the studio can move classes." };
  const c = await db.danceClass.findFirst({
    where: { id: classId, studioId: a.studio.id },
    select: { id: true, title: true, startTime: true, seriesId: true, venueId: true },
  });
  if (!c) return { ok: false, error: "Class not found." };
  const v = await venueFor(a.studio, str(formData, "venue"));
  if (!v) return { ok: false, error: "Pick a venue." };
  if ((v.id ?? null) === (c.venueId ?? null)) return { ok: false, error: "That's where it already is." };
  return moveClass(c, v, str(formData, "scope") === "future");
}

export async function moveClass(
  c: { id: string; seriesId: string | null; startTime: Date },
  v: { id: string | null; name: string; location: string; suburb: string | null },
  future: boolean,
): Promise<Result> {
  const now = new Date();
  const data = { venueId: v.id, location: v.location, suburb: v.suburb, venueChangedAt: now };
  const where = future && c.seriesId ? { seriesId: c.seriesId, startTime: { gte: c.startTime }, cancelledAt: null } : { id: c.id };
  const moved = await db.danceClass.findMany({ where, select: { id: true, title: true, startTime: true, timezone: true } });
  await db.danceClass.updateMany({ where, data });
  if (future && c.seriesId) {
    await db.classSeries.update({ where: { id: c.seriesId }, data: { venueId: v.id, location: v.location, suburb: v.suburb } });
  }
  const bookings = await db.booking.findMany({
    where: { classId: { in: moved.map((m) => m.id) }, status: { in: ["BOOKED", "PENDING_PAYMENT"] } },
    select: { classId: true, user: { select: { email: true, phone: true } } },
  });
  for (const b of bookings) {
    const m = moved.find((x) => x.id === b.classId)!;
    if (b.user.email) {
      await sendVenueChanged({
        to: b.user.email,
        classTitle: m.title,
        startTime: m.startTime,
        timezone: m.timezone,
        venueName: v.name,
        address: v.location,
        classUrl: appUrl(`/first-class/${m.id}`),
      }).catch((err) => logError("email.venueChanged", err));
    }
    await sendSms(b.user.phone, `${m.title}, ${formatClassWhen(m.startTime, m.timezone)}, has moved to ${v.name}, ${v.location}. Can't make it? Cancel free in StepUp.`).catch(() => false);
  }
  const n = `${bookings.length} ${bookings.length === 1 ? "student" : "students"}`;
  return done(
    `${moved[0]?.title ?? "Class"} ${future ? "(this and all future classes)" : "(this class only)"} moved to ${v.name}. ${n} told by ${smsConfigured() ? "SMS and email" : "email"}.`,
    ["/studio"],
  );
}

// ─── Create a class (v6.4 form) ──────────────────────────────────────────────

export async function createStudioClassV2Action(_prev: Result, formData: FormData): Promise<Result> {
  const a = await actor();
  if (!a) return { ok: false, error: "Only the people who run this studio can add classes." };
  const d = studioDraftFromForm((k) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : null;
  });

  const teacher = await db.studioMember.findFirst({
    where: { id: d.teacher, studioId: a.studio.id, teaches: true },
  });
  const payout = await db.payoutAccount.findUnique({ where: { userId: a.studio.ownerId } });
  const problems = studioClassProblems(d, {
    teacherWwccOk: Boolean(teacher && wwccCurrent(teacher, new Date())),
    today: dateKeyInTimeZone(new Date(), a.studio.timezone),
    canCharge: Boolean(payout?.chargesEnabled),
  });
  if (!teacher) problems.unshift("a teacher from your team");
  if (problems.length) return { ok: false, error: `Still needed: ${problems.join(", ")}.` };

  const allowed: readonly string[] = a.studio.styles.length ? a.studio.styles : DANCE_STYLES;
  if (!allowed.includes(d.style)) return { ok: false, error: "Pick one of your studio's styles." };
  if (d.kids && !a.studio.kidsClasses) {
    await db.studio.update({ where: { id: a.studio.id }, data: { kidsClasses: true } });
  }

  const v = await venueFor(a.studio, d.venue);
  if (!v) return { ok: false, error: "Pick a venue." };

  let made;
  try {
    made = await db.$transaction((tx) =>
      createStudioClass(tx, d, {
        hostId: a.studio.ownerId,
        studioId: a.studio.id,
        teacherMemberId: teacher!.id,
        timezone: a.studio.timezone,
        venue: v,
      }),
    );
  } catch (err) {
    logError("studio.createClassV2", err, { studioId: a.studio.id });
    return { ok: false, error: "We couldn't save that class. Try again in a moment." };
  }

  // People who asked to hear about this studio's next course.
  if (d.listing === "COURSE") await notifyCourseInterest(a.studio, d.style, made.firstId, made.firstStart).catch(() => {});

  for (const p of ["/start", "/discover", "/studio/classes", "/studio/profile"]) revalidatePath(p);
  const first = formatClassWhen(made.firstStart, a.studio.timezone).replace(/^(Today|Tomorrow)/, (m) => m.toLowerCase());
  if (d.listing === "HIDDEN") return done(`${made.title} is on your timetable, but not on StepUp.`);
  if (d.listing === "COURSE") return done(`${made.title} is live. Enrolments are open now. The course starts ${first}.`);
  return done(
    `${made.title} is live. Students can book it now. First class ${first}${
      made.sessions > 1 ? `, then ${d.repeat === "weekly" ? "every week" : "every 2 weeks"} at ${formatClock(d.time)}` : ""
    }.`,
  );
}

async function notifyCourseInterest(
  studio: { id: string; name: string; timezone: string },
  style: string,
  classId: string,
  startsOn: Date,
) {
  const waiting = await db.courseInterest.findMany({ where: { studioId: studio.id, style, notifiedAt: null } });
  for (const w of waiting) {
    const user = await db.user.findUnique({ where: { email: w.email }, select: { id: true } });
    const unsubscribe = user ? appUrl(unsubscribePath(user.id, studio.id)) : appUrl("/");
    await sendCourseOpen({
      to: w.email,
      studioName: studio.name,
      courseTitle: `${style} course`,
      startsOn,
      timezone: studio.timezone,
      url: appUrl(`/first-class/${classId}`),
      unsubscribeUrl: unsubscribe,
    }).catch((err) => logError("email.courseOpen", err));
    await db.courseInterest.update({ where: { id: w.id }, data: { notifiedAt: new Date() } });
  }
}

// ─── Team: roles and Working With Children Checks ───────────────────────────

export async function setMemberRoleAction(memberId: string, role: string): Promise<Result> {
  const a = await actor();
  if (!a?.perms.changeRoles) return { ok: false, error: "Only the studio's owner can change roles." };
  if (role !== "MANAGER" && role !== "TEACHER") return { ok: false, error: "Pick Manager or Teacher." };
  const m = await db.studioMember.findFirst({ where: { id: memberId, studioId: a.studio.id } });
  if (!m || m.role === "OWNER" || m.userId === a.studio.ownerId) return { ok: false, error: "That role can't be changed here." };
  await db.studioMember.update({ where: { id: memberId }, data: { role } });
  return done(`${m.name} is now a ${role === "MANAGER" ? "manager" : "teacher"}.`, ["/studio/team"]);
}

/**
 * Record a Working With Children Check the studio has looked up on the NSW
 * Office of the Children's Guardian site: the number, its expiry, and who
 * confirmed it and when. The format is checked here; the check itself can
 * only be done on the OCG site.
 */
export async function verifyWwccAction(memberId: string, formData: FormData): Promise<Result> {
  const a = await actor();
  if (!a) return { ok: false, error: "Only the people who run the studio can do this." };
  const m = await db.studioMember.findFirst({ where: { id: memberId, studioId: a.studio.id } });
  if (!m) return { ok: false, error: "Team member not found." };
  const number = normaliseWwcc(str(formData, "number"));
  if (!isWwccNumber(number)) return { ok: false, error: "That doesn’t look like a WWCC number. It should look like WWC1234567E." };
  const expiryRaw = str(formData, "expiry");
  const expiry = /^\d{4}-\d{2}-\d{2}$/.test(expiryRaw) ? new Date(`${expiryRaw}T12:00:00Z`) : null;
  if (!expiry || expiry.getTime() <= Date.now()) return { ok: false, error: "Add the expiry date shown on the check. It has to be in the future." };
  if (str(formData, "checked") !== "on") {
    return { ok: false, error: "Tick to confirm you checked it on the Office of the Children's Guardian site." };
  }
  await db.studioMember.update({
    where: { id: memberId },
    data: { wwccNumber: number, wwccExpiry: expiry, wwccVerifiedAt: new Date(), wwccVerifiedById: a.user.id, wwccReminderAt: null },
  });
  return done(`Working With Children Check ${number} recorded for ${m.name}. We’ll remind you 30 days before it expires.`, ["/studio/team", "/studio/policies"]);
}

// ─── Payouts ─────────────────────────────────────────────────────────────────

export async function setPayoutDayAction(day: string): Promise<Result> {
  const a = await actor();
  if (!a?.perms.payouts) return { ok: false, error: "Only the account holder manages payouts." };
  if (!(PAYOUT_DAYS as readonly string[]).includes(day)) return { ok: false, error: "Pick a weekday." };
  await db.studio.update({ where: { id: a.studio.id }, data: { payoutDay: day } });
  const account = await db.payoutAccount.findUnique({ where: { userId: a.studio.ownerId } });
  if (account) await setStripePayoutDay(account.stripeAccountId, day).catch((err: unknown) => logError("stripe.payoutSchedule", err));
  return done("Payout day saved.", ["/studio/payouts", "/studio"]);
}

// ─── Policies and terms ──────────────────────────────────────────────────────

export async function setStudioPolicyAction(policy: string): Promise<Result> {
  const a = await actor();
  if (!a) return { ok: false, error: "Not allowed." };
  if (!isPolicy(policy)) return { ok: false, error: "Pick a preset." };
  await db.studio.update({ where: { id: a.studio.id }, data: { cancelPolicy: policy } });
  return done("Cancellation policy saved. It applies to new bookings and cancellations from now.", ["/studio/policies"]);
}

export async function publishTermsAction(_prev: Result, formData: FormData): Promise<Result> {
  const a = await actor();
  if (!a?.perms.isOwner && a?.member?.role !== "MANAGER") return { ok: false, error: "Not allowed." };
  if (!a) return { ok: false, error: "Not allowed." };
  const mode = str(formData, "mode") === "UPLOAD" ? "UPLOAD" : "TEMPLATE";
  const last = await db.studioTerms.findFirst({ where: { studioId: a.studio.id }, orderBy: { version: "desc" } });
  let documentId: string | null = null;
  if (mode === "UPLOAD") {
    const doc = await saveUploadedPdf(formData.get("file"));
    if (doc && !doc.ok) return { ok: false, error: doc.error };
    documentId = doc?.id ?? (last?.mode === "UPLOAD" ? last.documentId : null);
    if (!documentId) return { ok: false, error: "Choose your terms PDF to upload." };
  }
  const waiver = str(formData, "waiver") === "on";
  const conduct = str(formData, "conduct") === "on";
  const cancellation = str(formData, "cancellation") === "on";
  if (mode === "TEMPLATE" && !waiver && !conduct && !cancellation) {
    return { ok: false, error: "Pick at least one part of the template." };
  }
  const version = (last?.version ?? 0) + 1;
  await db.studioTerms.create({
    data: { studioId: a.studio.id, version, mode, waiver, conduct, cancellation, documentId },
  });
  return done(`Terms version ${version} published. Students accept it at their next booking.`, ["/studio/policies", "/studio/profile"]);
}

export async function setHealthUrlAction(_prev: Result, formData: FormData): Promise<Result> {
  const a = await actor();
  if (!a) return { ok: false, error: "Not allowed." };
  const raw = str(formData, "healthUrl").trim();
  if (raw && !/^https:\/\/[^\s]+$/i.test(raw)) return { ok: false, error: "Use a full https:// link." };
  await db.studio.update({ where: { id: a.studio.id }, data: { healthFormUrl: raw || null } });
  return done(raw ? "Health form link saved." : "Health form link removed.", ["/studio/policies"]);
}

export async function setKidsClassesAction(on: boolean): Promise<Result> {
  const a = await actor();
  if (!a) return { ok: false, error: "Not allowed." };
  await db.studio.update({ where: { id: a.studio.id }, data: { kidsClasses: on } });
  return done(on ? "Kids' classes turned on." : "Kids' classes turned off.", ["/studio/policies"]);
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function saveProfileAction(_prev: Result, formData: FormData): Promise<Result> {
  const a = await actor();
  if (!a) return { ok: false, error: "Not allowed." };
  const bio = str(formData, "bio").trim();
  if (bio.length > 280) return { ok: false, error: "Keep the bio to 280 characters." };
  const styles = formData.getAll("styles").filter((s): s is string => typeof s === "string" && (DANCE_STYLES as readonly string[]).includes(s));
  if (styles.length === 0) return { ok: false, error: "Pick at least one style." };
  const approve = str(formData, "approve") === "on";
  await db.studio.update({
    where: { id: a.studio.id },
    data: {
      description: bio || a.studio.description,
      styles,
      ...(approve ? { profileApprovedAt: new Date(), draftBio: null, draftStyles: [] } : {}),
    },
  });
  if (approve) await db.studioPhoto.updateMany({ where: { studioId: a.studio.id, draft: true }, data: { draft: false } });
  return done(approve ? "Profile approved and live." : "Profile saved.", ["/studio/profile", "/studio"]);
}

export async function addStudioPhotoAction(_prev: Result, formData: FormData): Promise<Result> {
  const a = await actor();
  if (!a) return { ok: false, error: "Not allowed." };
  const count = await db.studioPhoto.count({ where: { studioId: a.studio.id } });
  if (count >= 12) return { ok: false, error: "That's 12 photos already. Remove one first." };
  const img = await saveUploadedImage(formData.get("photo"));
  if (!img) return { ok: false, error: "Choose a photo." };
  if (!img.ok) return { ok: false, error: img.error };
  await db.studioPhoto.create({ data: { studioId: a.studio.id, imageId: img.id, sort: count } });
  if (!a.studio.photoId) await db.studio.update({ where: { id: a.studio.id }, data: { photoId: img.id } });
  return done("Photo added.", ["/studio/profile"]);
}

export async function removeStudioPhotoAction(photoId: string): Promise<Result> {
  const a = await actor();
  if (!a) return { ok: false, error: "Not allowed." };
  const p = await db.studioPhoto.findFirst({ where: { id: photoId, studioId: a.studio.id } });
  if (!p) return { ok: false, error: "Photo not found." };
  await db.studioPhoto.delete({ where: { id: photoId } });
  if (a.studio.photoId === p.imageId) {
    const next = await db.studioPhoto.findFirst({ where: { studioId: a.studio.id, draft: false }, orderBy: { sort: "asc" } });
    await db.studio.update({ where: { id: a.studio.id }, data: { photoId: next?.imageId ?? null } });
  }
  await db.image.delete({ where: { id: p.imageId } }).catch(() => {});
  return done("Photo removed.", ["/studio/profile"]);
}

export async function saveLevelsAction(_prev: Result, formData: FormData): Promise<Result> {
  const a = await actor();
  if (!a) return { ok: false, error: "Not allowed." };
  const names = formData.getAll("levelName").map(String);
  const scales = formData.getAll("levelScale").map(String);
  const rows: { name: string; scale: string }[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i].trim().slice(0, 40);
    if (!name) continue;
    if (!isScaleLevel(scales[i])) return { ok: false, error: `Pick a StepUp level for ${name}.` };
    rows.push({ name, scale: scales[i] });
  }
  if (rows.length > 20) return { ok: false, error: "That's a lot of levels. Keep it to 20." };
  await db.$transaction([
    db.levelName.deleteMany({ where: { studioId: a.studio.id } }),
    db.levelName.createMany({ data: rows.map((r) => ({ ...r, studioId: a.studio.id })) }),
  ]);
  return done("Levels saved.", ["/studio/profile"]);
}

export async function saveTemplateAction(_prev: Result, formData: FormData): Promise<Result> {
  const a = await actor();
  if (!a) return { ok: false, error: "Not allowed." };
  const style = str(formData, "style");
  const scale = str(formData, "scale");
  if (!(DANCE_STYLES as readonly string[]).includes(style) || !isScaleLevel(scale)) return { ok: false, error: "Pick a style and level." };
  const description = str(formData, "description").trim().slice(0, 600);
  const wear = str(formData, "wear").trim().slice(0, 160);
  const plan = str(formData, "plan").trim().slice(0, 600);
  await db.classTemplate.upsert({
    where: { studioId_style_scale: { studioId: a.studio.id, style, scale } },
    create: { studioId: a.studio.id, style, scale, description, wear, plan },
    update: { description, wear, plan },
  });
  return done(`Template saved for ${style}.`, ["/studio/profile", "/studio"]);
}

export async function addVenueAction(_prev: Result, formData: FormData): Promise<Result> {
  const a = await actor();
  if (!a) return { ok: false, error: "Not allowed." };
  const name = str(formData, "name").trim().slice(0, 80);
  const address = str(formData, "address").trim().slice(0, 160);
  if (!name || !address) return { ok: false, error: "Add the venue's name and address." };
  await db.venue.create({ data: { studioId: a.studio.id, name, address, suburb: suburbFromAddress(address)?.name ?? null } });
  return done("Venue saved.", ["/studio/profile", "/studio"]);
}

export async function removeVenueAction(venueId: string): Promise<Result> {
  const a = await actor();
  if (!a) return { ok: false, error: "Not allowed." };
  const upcoming = await db.danceClass.count({ where: { venueId, startTime: { gte: new Date() }, cancelledAt: null } });
  if (upcoming) return { ok: false, error: `${upcoming} upcoming ${upcoming === 1 ? "class is" : "classes are"} there. Move ${upcoming === 1 ? "it" : "them"} first.` };
  await db.venue.deleteMany({ where: { id: venueId, studioId: a.studio.id } });
  return done("Venue removed.", ["/studio/profile"]);
}

// ─── Dancers: passes and offers ──────────────────────────────────────────────

export async function savePassAction(_prev: Result, formData: FormData): Promise<Result> {
  const a = await actor();
  if (!a) return { ok: false, error: "Not allowed." };
  const name = str(formData, "name").trim().slice(0, 60);
  const price = Number(str(formData, "price"));
  const link = str(formData, "link").trim();
  if (!name) return { ok: false, error: "Name the pass." };
  if (!Number.isFinite(price) || price < 0 || price > 5000) return { ok: false, error: "Add the pass price in dollars." };
  if (link && !/^https:\/\/\S+$/i.test(link)) return { ok: false, error: "Use a full https:// link, or leave it blank." };
  await db.studioPass.create({ data: { studioId: a.studio.id, name, priceCents: Math.round(price * 100), link: link || null } });
  return done(`${name} added.`, ["/studio/dancers"]);
}

export async function archivePassAction(passId: string): Promise<Result> {
  const a = await actor();
  if (!a) return { ok: false, error: "Not allowed." };
  await db.studioPass.updateMany({ where: { id: passId, studioId: a.studio.id }, data: { archivedAt: new Date() } });
  return done("Pass removed.", ["/studio/dancers"]);
}

/**
 * Send the studio's own pass offer to its students. StepUp takes no
 * commission on pass sales: the offer points them at the studio. Students
 * who opted out of this studio's offers are skipped, and each email carries
 * a one-click way out.
 */
export async function sendPassOfferAction(_prev: Result, formData: FormData): Promise<Result> {
  const a = await actor();
  if (!a) return { ok: false, error: "Not allowed." };
  const pass = await db.studioPass.findFirst({ where: { id: str(formData, "passId"), studioId: a.studio.id, archivedAt: null } });
  if (!pass) return { ok: false, error: "Pick one of your passes." };
  const message = str(formData, "message").trim().slice(0, 600);
  if (!message) return { ok: false, error: "Write the message." };
  const audience = str(formData, "audience") === "ALL" ? "ALL" : "FIRST";
  const auto = str(formData, "auto") === "on";

  await db.studio.update({
    where: { id: a.studio.id },
    data: { passOfferAuto: auto, passOfferPassId: pass.id, passOfferMessage: message },
  });
  if (str(formData, "saveOnly") === "on") return done(auto ? "Automatic pass offer saved." : "Automatic pass offer turned off.", ["/studio/dancers"]);

  const limit = await checkRateLimit(`pass-offer:${a.studio.id}`, 3, 24 * 60 * 60_000);
  if (!limit.allowed) return { ok: false, error: "That's three offers today already. Try again tomorrow." };

  const students = await passAudience(a.studio.ownerId, a.studio.id, audience);
  const offer = await db.passOffer.create({
    data: { studioId: a.studio.id, passId: pass.id, message, audience, recipients: students.length },
  });
  for (const s of students) {
    await deliverPassOffer(a.studio, pass, message, s, offer.id);
  }
  return done(`Pass offer sent to ${students.length} ${students.length === 1 ? "student" : "students"}. No commission on pass sales.`, ["/studio/dancers"]);
}

export async function passAudience(hostId: string, studioId: string, audience: "FIRST" | "ALL") {
  const optedOut = new Set((await db.studioOptOut.findMany({ where: { studioId }, select: { userId: true } })).map((o) => o.userId));
  const attended = await db.booking.groupBy({
    by: ["userId"],
    where: { class: { hostId }, status: "ATTENDED" },
    _count: { _all: true },
  });
  const ids = attended.filter((r) => (audience === "ALL" ? true : r._count._all === 1)).map((r) => r.userId).filter((id) => !optedOut.has(id));
  return db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } });
}

export async function deliverPassOffer(
  studio: { id: string; name: string; owner?: { email: string } | null },
  pass: { id: string; name: string; priceCents: number; link: string | null },
  message: string,
  student: { id: string; name: string; email: string },
  offerId: string,
) {
  const owner = studio.owner ?? (await db.studio.findUnique({ where: { id: studio.id }, select: { owner: { select: { email: true } } } }))?.owner;
  await sendPassOffer({
    to: student.email,
    name: student.name,
    studioName: studio.name,
    message,
    passName: pass.name,
    priceCents: pass.priceCents,
    link: pass.link,
    replyTo: owner?.email ?? null,
    unsubscribeUrl: appUrl(unsubscribePath(student.id, studio.id)),
  }).catch((err) => logError("email.passOffer", err));
  await db.passOfferRecipient.upsert({
    where: { offerId_userId: { offerId, userId: student.id } },
    create: { offerId, userId: student.id },
    update: {},
  });
}

/** For the closing insight and value line: a one-line natural date. */
export async function describeWhen(start: Date, tz: string) {
  return formatClassWhenLong(start, tz);
}
