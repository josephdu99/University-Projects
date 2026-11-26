import { after } from "next/server";
import { db } from "@/lib/db";
import { importContext, syncSheets } from "@/lib/schedule-sync";
import { claudeConfigured } from "@/lib/schedule-claude";
import { logError } from "@/lib/logger";
import { requireStudioAccess, studioPerms } from "@/lib/studio-access";
import { VerifyBanner } from "@/components/VerifyBanner";
import { StudioHome } from "@/components/studio/StudioHome";
import type { SheetProps } from "@/components/studio/ClassSheet";
import { isSheetTab } from "@/lib/sheet-tabs";
import { imageUrl } from "@/lib/images";
import { DANCE_STYLES, DAYS, LENGTHS } from "@/lib/class-form";
import { isMusic } from "@/lib/first-class";
import { isPolicy, type PolicyId } from "@/lib/policies";
import { isScaleLevel } from "@/lib/levels";
import { isListing } from "@/lib/listing";
import { isPartnerRule } from "@/lib/partner-roles";
import { wwccCurrent } from "@/lib/wwcc";
import { smsConfigured, smsNumberLabel } from "@/lib/sms";
import { dateKeyInTimeZone, dayOfWeekInTimeZone, toFormFields } from "@/lib/time";
import { initials, shortDay } from "@/lib/studio-format";
import { toSheetProps } from "@/lib/sheet-props";
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
  searchParams: Promise<{ create?: string; from?: string; class?: string; import?: string; tab?: string }>;
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
        days: [DAYS.find((d) => d.dow === dow)?.id ?? "Tue"],
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
    if (s) sheet = toSheetProps(s, { canManage: true, now });
  }

  // ── Timetable import: the connected sheet, and changes waiting. ──
  const [{ ctx: importCtx }, sheetSource, changes] = await Promise.all([
    importContext(studio, now),
    db.scheduleSource.findFirst({ where: { studioId: studio.id, kind: "SHEET_CSV", activatedAt: { not: null } } }),
    db.scheduleChange.findMany({
      where: { status: "PENDING", source: { studioId: studio.id } },
      orderBy: { createdAt: "asc" },
      include: { series: { select: { title: true } } },
      take: 20,
    }),
  ]);
  // Opening the dashboard syncs the sheet, if it hasn't been in 10 minutes.
  // After the page is sent, so it never slows the dashboard down.
  if (sheetSource && (!sheetSource.lastSyncedAt || now.getTime() - sheetSource.lastSyncedAt.getTime() > 10 * 60_000)) {
    after(() => syncSheets({ studioId: studio.id }).then(() => undefined).catch((err) => logError("sync.dashboardOpen", err)));
  }
  const ago = (d: Date | null) => {
    if (!d) return "not yet";
    const mins = Math.round((now.getTime() - d.getTime()) / 60_000);
    return mins < 1 ? "just now" : mins < 60 ? `${mins} min ago` : mins < 48 * 60 ? `${Math.round(mins / 60)} h ago` : `${Math.round(mins / 1440)} days ago`;
  };
  const changeText = (c: (typeof changes)[number]) =>
    c.field === "removed"
      ? `${c.series.title} is no longer in your sheet. ${c.bookedCount} ${c.bookedCount === 1 ? "student is" : "students are"} booked.`
      : c.field === "schedule"
        ? `${c.series.title}: your sheet now says ${c.toValue} instead of ${c.fromValue}. ${c.bookedCount} ${c.bookedCount === 1 ? "student is" : "students are"} booked.`
        : c.field === "venue"
          ? `${c.series.title}: your sheet now says ${c.toValue === "studio" ? studio.name : c.toValue} instead of ${c.fromValue === "studio" ? studio.name : c.fromValue}. ${c.bookedCount} booked.`
          : `${c.series.title}: the details in your sheet changed. ${c.bookedCount} ${c.bookedCount === 1 ? "student is" : "students are"} booked.`;

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
        openTab={isSheetTab(params.tab) ? params.tab : "list"}
        sheet={sheet}
        sheetVenues={venueOpts}
        smsOn={smsConfigured()}
        smsNumber={smsNumberLabel()}
        initialPanel={params.create === "1" ? "class" : params.import === "1" ? "import" : null}
        importer={{
          studioName: studio.name,
          ctx: importCtx,
          claudeOn: claudeConfigured(),
          sheet: sheetSource
            ? { name: sheetSource.name, checkedLabel: ago(sheetSource.lastSyncedAt), error: sheetSource.lastError, pendingNote: sheetSource.pendingNote }
            : null,
          changes: changes.map((c) => ({ id: c.id, text: changeText(c) })),
        }}
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
