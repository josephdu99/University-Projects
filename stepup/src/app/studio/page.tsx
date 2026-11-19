import { db } from "@/lib/db";
import { requireStudioAccess, studioPerms } from "@/lib/studio-access";
import { VerifyBanner } from "@/components/VerifyBanner";
import { StudioHome } from "@/components/studio/StudioHome";
import type { SheetProps } from "@/components/studio/ClassSheet";
import { imageUrl } from "@/lib/images";
import { DANCE_STYLES, DAYS, LENGTHS } from "@/lib/class-form";
import { isMusic } from "@/lib/first-class";
import { isPolicy, type PolicyId } from "@/lib/policies";
import { isScaleLevel } from "@/lib/levels";
import { isListing } from "@/lib/listing";
import { isPartnerRule } from "@/lib/partner-roles";
import { wwccCurrent } from "@/lib/wwcc";
import { smsConfigured, smsNumberLabel } from "@/lib/sms";
import { textKeyFor } from "@/lib/text-commands";
import { MARK_FROM_MINUTES } from "@/lib/attendance";
import { dateKeyInTimeZone, dayOfWeekInTimeZone, formatClassWhen, toFormFields } from "@/lib/time";
import { initials, sentAt, shortDay } from "@/lib/studio-format";
import type { StudioClassDraft } from "@/lib/studio-class-form";
import {
  classSheet,
  dashboardCounts,
  newStudentValue,
  paidSince,
  pastClasses,
  payoutDates,
  PAYOUT_DAY_LABEL,
  termWindow,
  upcomingClasses,
} from "@/lib/studio-data";

export const metadata = { title: "Studio, StepUp" };

export default async function StudioDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string; from?: string; class?: string }>;
}) {
  const access = await requireStudioAccess();
  const { user, studio } = access;
  const perms = studioPerms(access);
  const hostId = studio.ownerId;
  const params = await searchParams;
  const now = new Date();

  const [payout, members, holder, venues, levelNames, templates, upcoming, past, counts, term, studentRows] = await Promise.all([
    db.payoutAccount.findUnique({ where: { userId: hostId } }),
    db.studioMember.findMany({ where: { studioId: studio.id }, orderBy: { createdAt: "asc" } }),
    db.user.findUnique({ where: { id: hostId }, select: { name: true } }),
    db.venue.findMany({ where: { studioId: studio.id }, orderBy: { createdAt: "asc" } }),
    db.levelName.findMany({ where: { studioId: studio.id }, select: { name: true, scale: true } }),
    db.classTemplate.findMany({ where: { studioId: studio.id }, select: { style: true, scale: true, description: true, wear: true, plan: true } }),
    upcomingClasses(hostId, studio.name),
    pastClasses(hostId, studio.name),
    dashboardCounts(hostId),
    termWindow(studio.id, studio.createdAt),
    db.booking.groupBy({
      by: ["userId"],
      where: { class: { hostId }, status: { in: ["BOOKED", "ATTENDED", "NO_SHOW"] } },
      _count: { _all: true },
      _max: { bookedAt: true },
    }),
  ]);
  const value = await newStudentValue(hostId, term.start);

  // ── Who can be picked to teach a class. ──
  const expired = (m: { inviteExpiresAt: Date | null }) => !m.inviteExpiresAt || m.inviteExpiresAt.getTime() < now.getTime();
  const teachers = members
    .filter((m) => m.teaches && (m.status === "ACTIVE" || !expired(m)))
    .map((m) => ({
      id: m.id,
      name: m.name,
      wwccOk: wwccCurrent(m, now),
      label: m.userId === user.id ? `${m.name} (you)` : m.status === "ACTIVE" ? m.name : `${m.name} · invite pending`,
    }));

  const studioVenue = { id: "studio", name: studio.name, address: `${studio.address}, ${studio.city}` };
  const venueOpts = [studioVenue, ...venues.map((v) => ({ id: v.id, name: v.name, address: v.address }))];
  const studioPolicy: PolicyId = isPolicy(studio.cancelPolicy) ? studio.cancelPolicy : "STANDARD";

  // ── "Run again": the form opens filled from an earlier class. ──
  let prefill: Partial<StudioClassDraft> | null = null;
  if (params.from) {
    const src = await db.danceClass.findFirst({
      where: { id: params.from, studioId: studio.id },
      include: { series: { select: { frequency: true, courseWeeks: true, coursePriceCents: true } } },
    });
    if (src) {
      const dow = dayOfWeekInTimeZone(src.startTime, src.timezone);
      prefill = {
        listing: isListing(src.listing) ? src.listing : "DROP_IN",
        title: src.title,
        style: src.style,
        level: isScaleLevel(src.level) ? src.level : "",
        music: src.music && isMusic(src.music) ? src.music : "",
        desc: src.description,
        partnerClass: Boolean(src.partnerRule),
        rule: isPartnerRule(src.partnerRule) ? src.partnerRule : "CAPS",
        leadCap: String(src.leadCap ?? 8),
        followCap: String(src.followCap ?? 8),
        balanceX: String(src.balanceX ?? 2),
        day: DAYS.find((d) => d.dow === dow)?.id ?? "Tue",
        time: toFormFields(src.startTime, src.timezone).time,
        dur: LENGTHS.some((l) => l.min === src.durationMin) ? String(src.durationMin) : "60",
        repeat: src.series ? (src.series.frequency === "FORTNIGHTLY" ? "fortnightly" : "weekly") : "once",
        venue: src.venueId && venues.some((v) => v.id === src.venueId) ? src.venueId : "studio",
        cap: String(src.capacity),
        setAside: String(Math.min(src.stepupSpots ?? src.capacity, src.capacity)),
        price: String(Math.round(src.priceCents / 100)),
        weeks: String(src.series?.courseWeeks ?? 8),
        coursePrice: String(Math.round((src.series?.coursePriceCents ?? 16000) / 100)),
        policy: isPolicy(src.cancelPolicy) ? src.cancelPolicy : "studio",
        kids: src.kids,
        wear: src.wear ?? "",
        plan: src.plan ?? "",
        teacher: src.teacherMemberId ?? "",
      };
    }
  }

  // ── The class sheet, when a class is open. ──
  let sheet: SheetProps | null = null;
  if (params.class) {
    const s = await classSheet(params.class, hostId);
    if (s) {
      sheet = {
        id: s.id,
        title: s.title,
        whenLabel: formatClassWhen(s.startTime, s.timezone),
        venueId: s.venueId,
        venueName: s.venueName,
        teacherName: s.teacherName,
        partner: Boolean(s.partnerRule),
        roleSummary: s.roleSummary,
        ruleLabel: s.ruleLabel,
        roster: s.roster.map((r) => ({ bookingId: r.bookingId, name: r.name, first: r.first, role: r.role, note: r.note, status: r.status })),
        walkIns: s.walkIns,
        waitLeads: s.waitLeads,
        waitFollows: s.waitFollows,
        waitOthers: s.waitOthers,
        messages: s.messages.map((m) => ({
          id: m.id,
          body: m.body,
          meta: `Sent ${sentAt(m.createdAt, s.timezone)} to ${m.recipients} ${m.recipients === 1 ? "student" : "students"} by ${
            m.channels === "SMS_EMAIL" ? "SMS and email" : "email"
          } · ${m.sender}`,
        })),
        recovery: s.recovery.map((o) => `${o.title}, ${formatClassWhen(o.startTime, o.timezone)}`),
        textKey: textKeyFor(s.dow, s.style, s.title),
        past: s.startTime.getTime() + 3 * 60 * 60_000 < now.getTime(),
        canMark: !s.cancelledAt && s.startTime.getTime() - now.getTime() <= MARK_FROM_MINUTES * 60_000,
        hasSeries: Boolean(s.seriesId),
        canManage: true,
      };
    }
  }

  // ── Payouts line ──
  const dates = payoutDates(studio.payoutDay);
  const nextCents = payout?.chargesEnabled ? await paidSince(hostId, dates.last) : 0;

  // ── Students for the closing insight ──
  const once = studentRows.filter((r) => r._count._all === 1).length;
  const recent = [...studentRows].sort((a, b) => (b._max.bookedAt?.getTime() ?? 0) - (a._max.bookedAt?.getTime() ?? 0)).slice(0, 5);
  const faceUsers = recent.length
    ? await db.user.findMany({ where: { id: { in: recent.map((r) => r.userId) } }, select: { id: true, name: true } })
    : [];
  const faces = recent.map((r) => initials(faceUsers.find((u) => u.id === r.userId)?.name ?? "?"));

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <VerifyBanner verified={user.verified} />
      </div>
      <StudioHome
        name={studio.name}
        address={`${studio.address}, ${studio.city}`}
        timezone={studio.timezone}
        upcoming={upcoming}
        past={past}
        hosted={counts.hosted}
        checkIns={counts.checkIns}
        newStudents={value}
        payouts={{
          on: Boolean(payout?.chargesEnabled && payout?.payoutsEnabled),
          canSetUp: perms.payouts,
          holderName: holder?.name ?? "The studio's owner",
          nextLabel: `${PAYOUT_DAY_LABEL[studio.payoutDay] ?? "Thu"} ${shortDay(dates.next, studio.timezone).replace(/^\w+ /, "")}`,
          nextCents,
        }}
        students={{ total: studentRows.length, once, returned: studentRows.length - once, faces }}
        openId={sheet?.id ?? null}
        sheet={sheet}
        sheetVenues={venueOpts}
        smsOn={smsConfigured()}
        smsNumber={smsNumberLabel()}
        initialPanel={params.create === "1" ? "class" : null}
        create={{
          studioName: studio.name,
          styles: studio.styles.length ? studio.styles : DANCE_STYLES,
          teachers,
          venues: venueOpts,
          levelNames,
          templates,
          studioPolicy,
          canCharge: Boolean(payout?.chargesEnabled),
          today: dateKeyInTimeZone(now, studio.timezone),
          photoUrl: imageUrl(studio.photoId),
          prefill,
        }}
      />
    </>
  );
}
