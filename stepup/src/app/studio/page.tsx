import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireStudioAccess, memberRoleLine } from "@/lib/studio-access";
import { HostDashboard, type StudioMode } from "@/components/host/HostDashboard";
import type { TeamRow } from "@/components/studio/TeamSection";
import type { TeacherOption } from "@/components/onboarding/ClassFields";
import { VerifyBanner } from "@/components/VerifyBanner";
import { imageUrl } from "@/lib/images";
import { initialsOf, TEAM_ROLE_LABEL, type TeamRole } from "@/lib/team";
import {
  DANCE_STYLES,
  DAYS,
  LENGTHS,
  isPartner,
  type ClassDraft,
} from "@/lib/class-form";
import { isMusic } from "@/lib/first-class";
import { dayOfWeekInTimeZone, toFormFields } from "@/lib/time";

export const metadata = { title: "Studio, StepUp" };

function shortDate(d: Date) {
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Sydney" });
}

export default async function StudioDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string; from?: string; invite?: string }>;
}) {
  const { user, studio, isAccountHolder } = await requireStudioAccess();

  const [params, payout, members, holder, h] = await Promise.all([
    searchParams,
    // Studio classes are hosted by the account that signed the studio up, so
    // its payout account is the one that takes the money.
    db.payoutAccount.findUnique({ where: { userId: studio.ownerId } }),
    db.studioMember.findMany({
      where: { studioId: studio.id },
      orderBy: { createdAt: "asc" },
    }),
    db.user.findUnique({ where: { id: studio.ownerId }, select: { name: true } }),
    headers(),
  ]);

  const now = new Date();
  const expired = (m: { inviteExpiresAt: Date | null }) =>
    !m.inviteExpiresAt || m.inviteExpiresAt.getTime() < now.getTime();

  // ── Team list: you first, then everyone else in the order they joined. ──
  const mine = members.find((m) => m.userId === user.id) ?? null;
  const others = members.filter((m) => m.id !== mine?.id);
  const youRow: TeamRow = {
    id: mine?.id ?? "you",
    name: mine?.name ?? user.name ?? "You",
    initials: initialsOf(mine?.name ?? user.name ?? "You"),
    meta: [memberRoleLine(mine?.role ?? "OWNER", mine?.teaches ?? false), user.email]
      .filter(Boolean)
      .join(" · "),
    status: "You",
  };
  const team: TeamRow[] = [
    youRow,
    ...others.map((m): TeamRow => {
      const role = TEAM_ROLE_LABEL[(m.role as TeamRole) ?? "TEACHER"] ?? "Teacher";
      if (m.status === "ACTIVE") {
        return {
          id: m.id,
          name: m.name,
          initials: initialsOf(m.name),
          meta: `${memberRoleLine(m.role, m.teaches)} · ${m.contact}`,
          status: "Joined",
        };
      }
      const gone = expired(m);
      return {
        id: m.id,
        name: m.name,
        initials: initialsOf(m.name),
        meta: gone
          ? `${role} · ${m.contact} · invite ran out, send it again to make a new code`
          : `${role} · ${m.contact} · code ${m.inviteCode} · runs out ${shortDate(m.inviteExpiresAt!)}`,
        status: gone ? "Invite expired" : "Invite sent",
      };
    }),
  ];

  // ── Who can be picked to teach a class. ──
  const teachers: TeacherOption[] = members
    .filter((m) => m.teaches && (m.status === "ACTIVE" || !expired(m)))
    .map((m) => ({
      id: m.id,
      name: m.name,
      label:
        m.userId === user.id
          ? `${m.name} (you)`
          : m.status === "ACTIVE"
            ? m.name
            : `${m.name} · invite pending`,
    }));

  // ── "Run again": the form opens filled from an earlier class. ──
  let prefill: Partial<ClassDraft> | null = null;
  if (params.from) {
    const src = await db.danceClass.findFirst({
      where: { id: params.from, studioId: studio.id },
      include: { series: { select: { frequency: true } } },
    });
    if (src) {
      const dow = dayOfWeekInTimeZone(src.startTime, src.timezone);
      prefill = {
        title: src.title,
        style: src.style,
        music: src.music && isMusic(src.music) ? src.music : "",
        partner: src.partner && isPartner(src.partner) ? src.partner : "ROTATE",
        day: DAYS.find((d) => d.dow === dow)?.id ?? "Tue",
        time: toFormFields(src.startTime, src.timezone).time,
        dur: LENGTHS.some((l) => l.min === src.durationMin) ? String(src.durationMin) : "60",
        repeat: src.series ? (src.series.frequency === "FORTNIGHTLY" ? "fortnightly" : "weekly") : "once",
        room: src.room ?? "",
        cap: String(src.capacity),
        newSpots: String(Math.min(src.firstTimerSpots ?? 6, src.capacity)),
        price: String(Math.round(src.priceCents / 100)),
        wear: src.wear ?? "",
        plan: src.plan ?? "",
        teacher: src.teacherMemberId ?? "",
      };
    }
  }

  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  const mode: StudioMode = {
    name: studio.name,
    venueLine: `${studio.address}, ${studio.city}`,
    styles: studio.styles.length ? studio.styles : DANCE_STYLES,
    photoUrl: imageUrl(studio.photoId),
    teachers,
    team,
    ownerTeaches: mine?.teaches ?? false,
    inviterName: user.name ?? studio.name,
    canCharge: Boolean(payout?.chargesEnabled),
    isAccountHolder,
    accountHolderName: holder?.name ?? "the studio's owner",
    initialPanel: params.create === "1" ? "class" : params.invite === "1" ? "invite" : null,
    prefill,
    origin: `${proto}://${host}`,
  };

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <VerifyBanner verified={user.verified} />
      </div>

      <HostDashboard
        hostId={studio.ownerId}
        base="/studio"
        title={studio.name}
        metaPrimary={`${studio.address}, ${studio.city}`}
        timezone={studio.timezone}
        payoutsConnected={Boolean(payout?.chargesEnabled && payout?.payoutsEnabled)}
        // The studio's details are edited from its account's profile page, so
        // a manager doesn't get the button.
        editHref={isAccountHolder ? "/profile" : null}
        studio={mode}
      />
    </>
  );
}
