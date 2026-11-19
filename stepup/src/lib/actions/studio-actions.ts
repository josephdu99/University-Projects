"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { getStudioAccess } from "@/lib/studio-access";
import { DANCE_STYLES, classProblems, draftFromForm, formatClock } from "@/lib/class-form";
import { createFirstTimerClass } from "@/lib/first-timer-classes";
import { formatClassWhen } from "@/lib/time";
import {
  INVITE_TTL_DAYS,
  MAX_INVITES_PER_SEND,
  makeInviteCode,
  parseContact,
} from "@/lib/team";
import { sendTeacherInvite } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";

async function studioForAction() {
  const user = await getSessionUser();
  if (!user) return null;
  const access = await getStudioAccess(user.id);
  if (!access) return null;
  return { user, ...access };
}

// ─── Create a class ──────────────────────────────────────────────────────────

export type PublishState =
  | { ok: false; error: string }
  | { ok: true; message: string; at: number }
  | undefined;

export async function createStudioClassAction(
  _prev: PublishState,
  formData: FormData,
): Promise<PublishState> {
  const ctx = await studioForAction();
  if (!ctx) return { ok: false, error: "Only the people who run this studio can add classes." };
  const { studio } = ctx;

  const draft = draftFromForm((k) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : null;
  });
  const problems = classProblems(draft, "studio");
  if (problems.length) return { ok: false, error: `Still needed: ${problems.join(", ")}.` };

  const allowed: readonly string[] = studio.styles.length ? studio.styles : DANCE_STYLES;
  if (!allowed.includes(draft.style)) {
    return { ok: false, error: "Pick one of your studio's styles." };
  }

  const teacher = await db.studioMember.findFirst({
    where: { id: draft.teacher, studioId: studio.id, teaches: true },
    select: { id: true, name: true },
  });
  if (!teacher) return { ok: false, error: "Pick a teacher from your team." };

  // Paid classes need somewhere for the money to go. Classes are hosted by
  // the studio's account, so that is whose payout account counts.
  const priceCents = Number(draft.price) * 100;
  if (priceCents > 0) {
    const payout = await db.payoutAccount.findUnique({ where: { userId: studio.ownerId } });
    if (!payout?.chargesEnabled) {
      return {
        ok: false,
        error: "Set up payouts before charging for classes, or set the price to $0 for now.",
      };
    }
  }

  let made;
  try {
    made = await db.$transaction((tx) =>
      createFirstTimerClass(
        tx,
        draft,
        {
          kind: "studio",
          hostId: studio.ownerId,
          studioId: studio.id,
          teacherMemberId: teacher.id,
          timezone: studio.timezone,
          location: `${studio.address}, ${studio.city}`,
        },
        priceCents,
      ),
    );
  } catch (err) {
    logError("studio.createClass", err, { studioId: studio.id });
    return { ok: false, error: "We couldn't publish that class. Try again in a moment." };
  }

  revalidatePath("/studio");
  revalidatePath("/studio/classes");
  revalidatePath("/start");
  revalidatePath("/discover");

  const first = formatClassWhen(made.firstStart, studio.timezone).replace(/^(Today|Tomorrow)/, (m) => m.toLowerCase());
  return {
    ok: true,
    message: `${made.title} is live. Beginners can book it now. First class ${first}${
      made.sessions > 1 ? `, then ${draft.repeat === "weekly" ? "every week" : "every 2 weeks"} at ${formatClock(draft.time)}` : ""
    }.`,
    at: Date.now(),
  };
}

// ─── Invite teachers ─────────────────────────────────────────────────────────

export type SentInvite = {
  name: string;
  contact: string;
  kind: "email" | "mobile";
  code: string;
  role: "TEACHER" | "MANAGER";
};

export type InviteState =
  | { ok: false; error: string }
  | { ok: true; sent: SentInvite[]; skipped: string[]; at: number }
  | undefined;

export async function sendInvitesAction(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const ctx = await studioForAction();
  if (!ctx) return { ok: false, error: "Only the people who run this studio can invite teachers." };
  const { user, studio } = ctx;

  const names = formData.getAll("inviteName").map(String);
  const contacts = formData.getAll("inviteContact").map(String);
  const roles = formData.getAll("inviteRole").map(String);

  const rows: { name: string; contact: { kind: "email" | "mobile"; value: string }; role: "TEACHER" | "MANAGER" }[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = (names[i] ?? "").trim();
    const raw = (contacts[i] ?? "").trim();
    if (!name && !raw) continue;
    const contact = parseContact(raw);
    if (!name || name.length > 60 || !contact) {
      return { ok: false, error: "Each teacher needs a name and an email or Australian mobile." };
    }
    rows.push({ name, contact, role: roles[i] === "MANAGER" ? "MANAGER" : "TEACHER" });
  }
  if (rows.length === 0) return { ok: false, error: "Add at least one teacher." };
  if (rows.length > MAX_INVITES_PER_SEND) {
    return { ok: false, error: `Invite up to ${MAX_INVITES_PER_SEND} people at a time.` };
  }

  const limit = await checkRateLimit(`invites:${studio.id}`, 60, 24 * 60 * 60_000);
  if (!limit.allowed) {
    return { ok: false, error: "That's a lot of invites for one day. Try again tomorrow." };
  }

  const team = await db.studioMember.findMany({
    where: { studioId: studio.id },
    select: { id: true, contact: true, status: true, user: { select: { email: true } } },
  });
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60_000);

  const sent: SentInvite[] = [];
  const skipped: string[] = [];
  for (const row of rows) {
    const same = team.find(
      (m) =>
        m.contact.toLowerCase() === row.contact.value ||
        m.user?.email.toLowerCase() === row.contact.value,
    );
    if (same?.status === "ACTIVE") {
      skipped.push(`${row.name} is already on the team`);
      continue;
    }

    // A fresh code each time, even for someone invited before: the old one
    // stops working, so only the latest message can be used.
    let code = "";
    for (let attempt = 0; attempt < 5 && !code; attempt++) {
      const candidate = makeInviteCode(studio.name);
      const clash = await db.studioMember.findUnique({ where: { inviteCode: candidate }, select: { id: true } });
      if (!clash) code = candidate;
    }
    if (!code) {
      skipped.push(`${row.name} (try again)`);
      continue;
    }

    const data = {
      name: row.name,
      contact: row.contact.value,
      role: row.role,
      status: "INVITED",
      teaches: true,
      inviteCode: code,
      inviteExpiresAt: expiresAt,
      invitedById: user.id,
    };
    if (same) await db.studioMember.update({ where: { id: same.id }, data });
    else await db.studioMember.create({ data: { ...data, studioId: studio.id } });

    if (row.contact.kind === "email") {
      await sendTeacherInvite({
        to: row.contact.value,
        name: row.name,
        studioName: studio.name,
        invitedBy: user.name ?? studio.name,
        role: row.role,
        code,
        expiresAt,
      }).catch((err) => logError("email.teacherInvite", err, { studioId: studio.id }));
    }
    sent.push({ name: row.name, contact: row.contact.value, kind: row.contact.kind, code, role: row.role });
  }

  revalidatePath("/studio");
  return { ok: true, sent, skipped, at: Date.now() };
}

/** "I teach classes here too": whether you can be picked as a class's teacher. */
export async function setOwnerTeachesAction(teaches: boolean): Promise<void> {
  const ctx = await studioForAction();
  if (!ctx) return;
  const { user, studio, member } = ctx;
  if (member) {
    await db.studioMember.update({ where: { id: member.id }, data: { teaches } });
  } else {
    await db.studioMember.create({
      data: {
        studioId: studio.id,
        userId: user.id,
        name: user.name ?? "You",
        contact: user.email ?? "",
        role: "OWNER",
        status: "ACTIVE",
        teaches,
        joinedAt: new Date(),
      },
    });
  }
  revalidatePath("/studio");
}
