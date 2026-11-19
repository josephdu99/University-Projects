import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { toE164 } from "@/lib/sms";
import { matchTextClass, parseTextCommand, type ParsedText } from "@/lib/text-commands";
import { cancelClass } from "@/lib/class-cancel";
import { moveClass, sendToClass, venueFor } from "@/lib/studio-ops";
import { addDaysToDateString, dateKeyInTimeZone, dayOfWeekInTimeZone, formatClassWhen } from "@/lib/time";

/**
 * Twilio signs each webhook: base64 HMAC-SHA1, keyed with the auth token, of
 * the full URL followed by every POST field (sorted by name) as name+value.
 */
export function validTwilioSignature(url: string, fields: Record<string, string>, signature: string, token: string): boolean {
  const data = url + Object.keys(fields).sort().map((k) => k + fields[k]).join("");
  const expected = createHmac("sha1", token).update(data, "utf8").digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

const CONFIRM_MINUTES = 15;
const HELP =
  "StepUp: text 'cancel thu salsa', 'msg thu salsa: we're in studio B' or 'move thu salsa to redfern hall'. We'll ask you to confirm first.";

type Sender = {
  userId: string;
  name: string;
  /** Classes they teach (as a studio's teacher). */
  memberIds: string[];
  /** Studios they run (owner or manager): every class there. */
  adminStudioIds: string[];
};

/** Who is texting: a teacher or studio admin with this mobile on StepUp. */
export async function findSender(from: string): Promise<Sender | null> {
  const e164 = toE164(from) ?? from;
  const users = await db.user.findMany({
    where: { phone: { not: null }, suspendedAt: null },
    select: { id: true, name: true, phone: true },
  });
  const user = users.find((u) => toE164(u.phone) === e164);
  const members = await db.studioMember.findMany({
    where: { status: "ACTIVE", ...(user ? { OR: [{ userId: user.id }, { contact: { not: "" } }] } : {}) },
    select: { id: true, role: true, userId: true, contact: true, studioId: true, name: true },
  });
  const mine = members.filter((m) => (user && m.userId === user.id) || toE164(m.contact) === e164);
  const userId = user?.id ?? mine.find((m) => m.userId)?.userId ?? null;
  if (!userId) return null;
  const owned = await db.studio.findMany({ where: { ownerId: userId }, select: { id: true } });
  return {
    userId,
    name: user?.name ?? mine[0]?.name ?? "there",
    memberIds: mine.map((m) => m.id),
    adminStudioIds: [...new Set([...owned.map((s) => s.id), ...mine.filter((m) => m.role === "OWNER" || m.role === "MANAGER").map((m) => m.studioId)])],
  };
}

async function classesFor(sender: Sender, now: Date) {
  return db.danceClass.findMany({
    where: {
      cancelledAt: null,
      startTime: { gte: new Date(now.getTime() - 60 * 60_000), lte: new Date(now.getTime() + 8 * 24 * 60 * 60_000) },
      OR: [
        { teacherMemberId: { in: sender.memberIds } },
        { studioId: { in: sender.adminStudioIds } },
        { hostId: sender.userId, studioId: null },
      ],
    },
    select: {
      id: true,
      title: true,
      style: true,
      startTime: true,
      timezone: true,
      seriesId: true,
      studioId: true,
      studio: { select: { id: true, name: true, address: true, city: true, suburb: true, owner: { select: { email: true } } } },
      host: { select: { name: true, displayName: true, email: true } },
      _count: { select: { bookings: { where: { status: { in: ["BOOKED", "PENDING_PAYMENT"] } } } } },
    },
    orderBy: { startTime: "asc" },
  });
}

/** Handle one inbound text and return the reply. */
export async function handleInboundText(from: string, body: string, now = new Date()): Promise<string> {
  const sender = await findSender(from);
  if (!sender) return "StepUp doesn't know this number yet. Add your mobile to your StepUp profile, then text again.";
  const parsed: ParsedText = parseTextCommand(body);

  if (parsed.kind === "CONFIRM" || parsed.kind === "DECLINE") {
    const pending = await db.textCommand.findFirst({
      where: { userId: sender.userId, status: "PENDING", expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
    });
    if (!pending) return "Nothing waiting to confirm. " + HELP;
    if (parsed.kind === "DECLINE") {
      await db.textCommand.update({ where: { id: pending.id }, data: { status: "DECLINED" } });
      return "OK, nothing changed.";
    }
    const claim = await db.textCommand.updateMany({ where: { id: pending.id, status: "PENDING" }, data: { status: "DONE" } });
    if (claim.count !== 1) return "That's already been done.";
    return runCommand(pending.kind, JSON.parse(pending.payload), pending.classId, sender.userId);
  }

  if (parsed.kind === "UNKNOWN") return HELP;

  const classes = await classesFor(sender, now);
  const tz = classes[0]?.timezone ?? "Australia/Sydney";
  const today = dateKeyInTimeZone(now, tz);
  const match = matchTextClass(
    classes,
    parsed.day,
    parsed.words,
    now,
    (c) => ({ dow: dayOfWeekInTimeZone(c.startTime, c.timezone), dateKey: dateKeyInTimeZone(c.startTime, c.timezone) }),
    today,
    addDaysToDateString(today, 1),
  );
  if (!match) return `I couldn't find a class of yours for '${parsed.day} ${parsed.words.join(" ")}' in the next week. ${HELP}`;
  const when = `${match.title}, ${formatClassWhen(match.startTime, match.timezone)}`;
  const n = match._count.bookings;

  let payload: Record<string, string> = {};
  let question = "";
  if (parsed.kind === "CANCEL") {
    question = `Cancel ${when}? ${n} booked will be refunded and told. Reply YES to confirm or NO to leave it.`;
  } else if (parsed.kind === "MESSAGE") {
    payload = { message: parsed.message };
    question = `Send "${parsed.message}" to the ${n} booked for ${when}? Reply YES or NO.`;
  } else if (parsed.kind === "MOVE") {
    if (!match.studio) return "Moving by text works for studio classes. Change the venue in the app.";
    const venues = await db.venue.findMany({ where: { studioId: match.studio.id }, select: { id: true, name: true } });
    const wanted = parsed.venue.toLowerCase();
    const studioName = match.studio.name.toLowerCase();
    const venue =
      venues.find((v) => v.name.toLowerCase() === wanted) ??
      venues.find((v) => v.name.toLowerCase().includes(wanted) || wanted.includes(v.name.toLowerCase())) ??
      (studioName.includes(wanted) || wanted.includes(studioName) || wanted === "studio" ? { id: "studio", name: match.studio.name } : null);
    if (!venue) {
      return `I don't know a venue called '${parsed.venue}'. Saved venues: ${[match.studio.name, ...venues.map((v) => v.name)].join(", ")}.`;
    }
    payload = { venue: venue.id };
    question = `Move ${when} to ${venue.name}? ${n} booked will be told and can cancel free. Reply YES or NO.`;
  }

  await db.textCommand.updateMany({ where: { userId: sender.userId, status: "PENDING" }, data: { status: "SUPERSEDED" } });
  await db.textCommand.create({
    data: {
      userId: sender.userId,
      classId: match.id,
      kind: parsed.kind,
      payload: JSON.stringify(payload),
      expiresAt: new Date(now.getTime() + CONFIRM_MINUTES * 60_000),
    },
  });
  return question;
}

async function runCommand(kind: string, payload: Record<string, string>, classId: string, senderId: string): Promise<string> {
  const c = await db.danceClass.findUnique({
    where: { id: classId },
    select: {
      id: true,
      title: true,
      startTime: true,
      timezone: true,
      seriesId: true,
      cancelledAt: true,
      studio: { select: { id: true, name: true, address: true, city: true, suburb: true, owner: { select: { email: true } } } },
      host: { select: { name: true, displayName: true, email: true } },
    },
  });
  if (!c || c.cancelledAt) return "That class is already cancelled.";
  if (kind === "CANCEL") {
    await cancelClass(classId, "Cancelled by the teacher");
    return `Done. ${c.title} is cancelled and everyone booked has been told.`;
  }
  if (kind === "MESSAGE") return `Done. ${await sendToClass(c, senderId, payload.message ?? "")}`;
  if (kind === "MOVE" && c.studio) {
    const v = await venueFor(c.studio, payload.venue ?? "studio");
    if (!v) return "That venue has gone. Nothing changed.";
    return `Done. ${await moveClass(c, v, false)}`;
  }
  return HELP;
}
