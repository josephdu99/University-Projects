import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/email";
import { sendClassRescheduled } from "@/lib/email-studio";
import { sendSms } from "@/lib/sms";
import { DAYS, type DayId } from "@/lib/class-form";
import { sessionStarts } from "@/lib/class-schedule";
import { createStudioClass } from "@/lib/studio-classes";
import { BLANK_STUDIO_CLASS, studioClassProblems, type StudioClassDraft } from "@/lib/studio-class-form";
import { templateFor } from "@/lib/class-templates";
import { cancelSeriesFrom } from "@/lib/class-cancel";
import { moveClass, sendToClass, venueFor } from "@/lib/studio-ops";
import { wwccCurrent } from "@/lib/wwcc";
import { addDaysToDateString, dateKeyInTimeZone, dayOfWeekInTimeZone, formatClassWhen, toFormFields, zonedDateTimeToUtc } from "@/lib/time";
import {
  csvUrlFor,
  guessMapping,
  isAllowedSheetHost,
  isSheetUrl,
  matchRow,
  musicForStyle,
  parseTable,
  rowBlockers,
  rowsFromTable,
  type ColumnMapping,
  type ReviewRow,
  type StudioContext,
} from "@/lib/schedule-import";
import { appliedRow, diffSheet, whenLabel, type AppliedRow, type Imported } from "@/lib/schedule-diff";
import { logError } from "@/lib/logger";

/**
 * Timetable import, server side: the studio's context for matching, fetching
 * a published sheet, creating classes from reviewed rows, and the sync that
 * keeps a connected sheet and StepUp in step. One function, `syncSheets`,
 * does every sync: the daily cron, the dashboard-open sync and Sync now.
 */

type StudioLite = {
  id: string;
  name: string;
  ownerId: string;
  timezone: string;
  address: string;
  city: string;
  suburb: string | null;
  styles: string[];
};

// ─── The studio, for matching ────────────────────────────────────────────────

export async function importContext(studio: StudioLite, now = new Date()) {
  const [members, venues, levelNames, upcoming, payout, templates] = await Promise.all([
    db.studioMember.findMany({ where: { studioId: studio.id, teaches: true } }),
    db.venue.findMany({ where: { studioId: studio.id }, orderBy: { createdAt: "asc" } }),
    db.levelName.findMany({ where: { studioId: studio.id }, select: { name: true, scale: true } }),
    db.danceClass.findMany({
      where: { studioId: studio.id, startTime: { gte: now }, cancelledAt: null },
      select: { title: true, startTime: true, timezone: true },
      take: 500,
    }),
    db.payoutAccount.findUnique({ where: { userId: studio.ownerId }, select: { chargesEnabled: true } }),
    db.classTemplate.findMany({ where: { studioId: studio.id } }),
  ]);
  const live = members.filter((m) => m.status === "ACTIVE" || (m.inviteExpiresAt && m.inviteExpiresAt > now));
  const seen = new Set<string>();
  const existing: StudioContext["existing"] = [];
  for (const c of upcoming) {
    const day = DAYS.find((d) => d.dow === dayOfWeekInTimeZone(c.startTime, c.timezone))!.id;
    const time = toFormFields(c.startTime, c.timezone).time;
    const k = `${c.title.toLowerCase()}|${day}|${time}`;
    if (!seen.has(k)) {
      seen.add(k);
      existing.push({ title: c.title, day, time });
    }
  }
  const ctx: StudioContext & { canCharge: boolean } = {
    styles: studio.styles,
    teachers: live.map((m) => ({ id: m.id, name: m.name, wwccOk: wwccCurrent(m, now) })),
    venues: venues.map((v) => ({ id: v.id, name: v.name, address: v.address })),
    levelNames,
    existing,
    canCharge: Boolean(payout?.chargesEnabled),
  };
  return { ctx, templates };
}

// ─── Fetching a published sheet ─────────────────────────────────────────────

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

const MAX_CSV_BYTES = 2 * 1024 * 1024;

/**
 * Fetch a published sheet's CSV. Only Google's own hosts, even across
 * redirects (a published CSV redirects to googleusercontent.com), so a
 * crafted link can't point our server anywhere else.
 */
export async function fetchSheetCsv(
  url: string,
  fetcher: Fetcher = fetch,
): Promise<{ ok: true; text: string; hash: string } | { ok: false; error: string }> {
  if (!isSheetUrl(url)) return { ok: false, error: "That isn’t a Google Sheets link. Use File › Share › Publish to web, then copy the CSV link." };
  let next = csvUrlFor(url);
  for (let hop = 0; hop < 5; hop++) {
    const host = new URL(next).hostname;
    if (new URL(next).protocol !== "https:" || !isAllowedSheetHost(host)) return { ok: false, error: "That sheet link leads somewhere other than Google Sheets." };
    let res: Response;
    try {
      res = await fetcher(next, { redirect: "manual", signal: AbortSignal.timeout(10_000), headers: { Accept: "text/csv" } });
    } catch {
      return { ok: false, error: "Google Sheets didn’t answer. Try again in a minute." };
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return { ok: false, error: "Google Sheets sent us nowhere. Check the link." };
      next = new URL(loc, next).toString();
      continue;
    }
    if (res.status === 404) return { ok: false, error: "That sheet wasn’t found. Check it’s still published to the web." };
    if (!res.ok) return { ok: false, error: "That sheet isn’t published yet. In Google Sheets: File › Share › Publish to web › CSV." };
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_CSV_BYTES) return { ok: false, error: "That sheet is too big to read. Publish just the timetable tab." };
    const text = await res.text();
    if (text.length > MAX_CSV_BYTES) return { ok: false, error: "That sheet is too big to read. Publish just the timetable tab." };
    if (/^\s*<(!doctype|html)/i.test(text) || (res.headers.get("content-type") ?? "").includes("text/html")) {
      return { ok: false, error: "That link gives a web page, not CSV. In Publish to web, choose Comma-separated values (.csv)." };
    }
    return { ok: true, text, hash: createHash("sha256").update(text).digest("hex") };
  }
  return { ok: false, error: "Too many redirects from that sheet link." };
}

/** A table with a header row, and the mapping to read it with. */
export function tableWithMapping(text: string, saved?: ColumnMapping | null) {
  const table = parseTable(text);
  const mapping = saved && Object.keys(saved).length ? saved : guessMapping(table[0] ?? []);
  return { table, mapping };
}

// ─── Creating classes from reviewed rows ────────────────────────────────────

export type SourceInput = {
  kind: "SHEET_CSV" | "PASTE" | "IMAGE";
  name: string;
  url?: string | null;
  mapping?: ColumnMapping | null;
  headers?: string[];
  hash?: string | null;
  /** An image run already logged, to mark as published. */
  runId?: string | null;
};

function draftFor(r: ReviewRow, templates: { style: string; scale: string; description: string; wear: string; plan: string }[]): StudioClassDraft {
  const tpl = templateFor(r.style, r.level || "BEGINNER", templates);
  const aside = Math.max(1, Number(r.setAside) || 6);
  return {
    ...BLANK_STUDIO_CLASS,
    listing: r.price === "0" ? "TRIAL" : "DROP_IN",
    title: r.title.trim(),
    teacher: r.teacher,
    style: r.style,
    level: r.level,
    music: musicForStyle(r.style),
    desc: tpl.description,
    wear: tpl.wear,
    plan: tpl.plan,
    days: [(r.day || "Mon") as DayId],
    time: r.time,
    dur: r.dur,
    repeat: r.repeat,
    venue: r.venue || "studio",
    cap: String(Math.max(20, aside)),
    setAside: String(aside),
    price: r.price === "" ? "0" : r.price,
    policy: "studio",
    kids: r.kids,
    // The studio's First Timer promise, which it made when it listed.
    promise: [true, true, true],
  };
}

async function createFromRow(
  studio: StudioLite,
  r: ReviewRow,
  ctx: StudioContext & { canCharge: boolean },
  templates: Parameters<typeof draftFor>[1],
  sourceId: string,
  now: Date,
): Promise<{ ok: true; seriesId: string | null } | { ok: false; why: string }> {
  const blockers = rowBlockers(r, ctx);
  if (blockers.length) return { ok: false, why: blockers.join(" ") };
  const d = draftFor(r, templates);
  const teacher = ctx.teachers.find((t) => t.id === r.teacher);
  const problems = studioClassProblems(d, { teacherWwccOk: Boolean(teacher?.wwccOk), today: dateKeyInTimeZone(now, studio.timezone), canCharge: ctx.canCharge });
  if (!teacher) problems.unshift("a teacher from your team");
  if (problems.length) return { ok: false, why: `Still needed: ${problems.join(", ")}.` };
  const venue = await venueFor(studio, d.venue);
  if (!venue) return { ok: false, why: "Pick a venue." };
  const made = await db.$transaction(async (tx) => {
    const m = await createStudioClass(
      tx,
      d,
      { hostId: studio.ownerId, studioId: studio.id, teacherMemberId: teacher!.id, timezone: studio.timezone, venue, room: venue.id ? null : r.room },
      now,
    );
    if (m.seriesId) {
      await tx.classSeries.update({
        where: { id: m.seriesId },
        data: { scheduleSourceId: sourceId, importRowKey: r.rowKey, importRow: appliedRow(r) as unknown as Prisma.InputJsonValue },
      });
    }
    return m;
  });
  return { ok: true, seriesId: made.seriesId };
}

/**
 * The studio pressed "Create N classes". Every row is checked again here
 * (the browser's checks are a convenience), then each becomes a repeating
 * class. A sheet becomes the connected sheet, synced from now on.
 */
export async function publishRows(studio: StudioLite, rows: ReviewRow[], source: SourceInput, now = new Date()) {
  const { ctx, templates } = await importContext(studio, now);
  const included = rows.filter((r) => r.include).slice(0, 100);

  let sourceId: string;
  if (source.kind === "SHEET_CSV") {
    // One connected sheet per studio: connecting another replaces it.
    const existing = await db.scheduleSource.findFirst({ where: { studioId: studio.id, kind: "SHEET_CSV" } });
    const data = {
      name: source.name.slice(0, 120),
      url: source.url ?? null,
      mapping: (source.mapping ?? {}) as Prisma.InputJsonValue,
      headers: source.headers ?? [],
      lastHash: source.hash ?? null,
      lastSyncedAt: now,
      lastError: null,
      activatedAt: now,
      autoSync: true,
    };
    sourceId = existing
      ? (await db.scheduleSource.update({ where: { id: existing.id }, data })).id
      : (await db.scheduleSource.create({ data: { ...data, kind: "SHEET_CSV", studioId: studio.id } })).id;
  } else if (source.runId) {
    const run = await db.importRun.findFirst({ where: { id: source.runId, source: { studioId: studio.id } }, select: { sourceId: true } });
    sourceId = run?.sourceId ?? (await db.scheduleSource.create({ data: { kind: source.kind, name: source.name.slice(0, 120), studioId: studio.id, activatedAt: now } })).id;
  } else {
    sourceId = (await db.scheduleSource.create({ data: { kind: source.kind, name: source.name.slice(0, 120), studioId: studio.id, activatedAt: now } })).id;
  }

  const created: string[] = [];
  const skipped: { title: string; why: string }[] = [];
  const logRows: Prisma.ImportRowCreateManyRunInput[] = [];
  for (const r of included) {
    const res = await createFromRow(studio, r, ctx, templates, sourceId, now).catch((err) => {
      logError("import.createRow", err, { studioId: studio.id });
      return { ok: false as const, why: "We couldn't save this one. Try again." };
    });
    if (res.ok) created.push(r.title);
    else skipped.push({ title: r.title || "Untitled", why: res.why });
    logRows.push({
      data: appliedRow(r) as unknown as Prisma.InputJsonValue,
      uncertain: r.check,
      missing: [],
      rowKey: r.rowKey,
      decision: res.ok ? "INCLUDE" : "SKIP",
      matchedSeriesId: res.ok ? res.seriesId : null,
    });
  }
  for (const r of rows.filter((x) => !x.include)) {
    logRows.push({ data: appliedRow(r) as unknown as Prisma.InputJsonValue, uncertain: r.check, missing: [], rowKey: r.rowKey, decision: r.dup ? "DUPLICATE" : "SKIP" });
  }
  if (source.runId) {
    await db.importRun.updateMany({ where: { id: source.runId, sourceId }, data: { status: "PUBLISHED" } });
    await db.importRow.createMany({ data: logRows.map((x) => ({ ...x, runId: source.runId! })) });
  } else {
    await db.importRun.create({ data: { sourceId, status: "PUBLISHED", raw: { rows: rows.length } as Prisma.InputJsonValue, rows: { create: logRows } } });
  }
  return { created, skipped, sourceId };
}

// ─── Applying a change to a class ───────────────────────────────────────────

const SESSION_SELECT = {
  id: true,
  title: true,
  startTime: true,
  timezone: true,
  bookings: { where: { status: { in: ["BOOKED", "PENDING_PAYMENT"] } }, select: { user: { select: { email: true, phone: true } } } },
} satisfies Prisma.DanceClassSelect;

/** The same week, the new weekday and time: Tue 7:30pm → Thu 7:45pm. */
function shiftedStart(start: Date, tz: string, day: DayId, time: string): Date {
  const local = toFormFields(start, tz).date;
  const from = dayOfWeekInTimeZone(start, tz);
  const to = DAYS.find((d) => d.id === day)!.dow;
  let delta = (to - from + 7) % 7;
  if (delta > 3) delta -= 7;
  return zonedDateTimeToUtc(addDaysToDateString(local, delta), time, tz);
}

/**
 * Bring a class in line with its sheet row. Classes nobody has booked are
 * just updated. Approved changes to booked classes also tell everyone
 * booked, and let them cancel free (`venueChangedAt`).
 */
export async function applyRow(
  studio: StudioLite,
  seriesId: string,
  row: ReviewRow | AppliedRow,
  opts: { notify: boolean; now?: Date },
): Promise<string> {
  const now = opts.now ?? new Date();
  const series = await db.classSeries.findUnique({
    where: { id: seriesId },
    include: { sessions: { where: { startTime: { gte: now }, cancelledAt: null }, select: SESSION_SELECT, orderBy: { startTime: "asc" } } },
  });
  if (!series) return "That class no longer exists.";
  const prev = (series.importRow ?? {}) as Partial<AppliedRow>;
  const tz = series.timezone;
  const venue = await venueFor(studio, row.venue || "studio");
  const price = row.price === "" ? 0 : Number(row.price);
  const listing = row.price === "0" ? "TRIAL" : "DROP_IN";
  const common = {
    title: row.title.trim(),
    style: row.style,
    level: row.level || series.level,
    teacherMemberId: row.teacher || series.teacherMemberId,
    priceCents: listing === "DROP_IN" ? price * 100 : 0,
    listing,
    stepupSpots: Math.max(1, Number(row.setAside) || series.stepupSpots || 6),
    durationMin: Number(row.dur) || series.durationMin,
    kids: row.kids,
    ...(venue ? { venueId: venue.id, location: venue.location, suburb: venue.suburb } : {}),
  };

  const scheduleChanged = prev.day !== row.day || prev.time !== row.time || prev.repeat !== row.repeat;
  const venueChanged = (prev.venue ?? "studio") !== (row.venue || "studio") || (prev.room ?? "") !== (row.room ?? "");
  const moved: { id: string; title: string; oldStart: Date; newStart: Date; emails: string[]; phones: (string | null)[] }[] = [];

  await db.$transaction(async (tx) => {
    await tx.classSeries.update({
      where: { id: seriesId },
      data: {
        ...common,
        dayOfWeek: DAYS.find((d) => d.id === row.day)?.dow ?? series.dayOfWeek,
        localTime: row.time || series.localTime,
        frequency: row.repeat === "fortnightly" ? "FORTNIGHTLY" : "WEEKLY",
        importRow: appliedRow(row as ReviewRow) as unknown as Prisma.InputJsonValue,
      },
    });
    const keep = series.sessions.filter((s) => s.bookings.length > 0);
    if (scheduleChanged && prev.repeat !== row.repeat) {
      // A new rhythm: unbooked dates are replaced, booked ones move with it.
      await tx.danceClass.deleteMany({ where: { id: { in: series.sessions.filter((s) => s.bookings.length === 0).map((s) => s.id) } } });
      const keptDates = new Set<string>();
      for (const s of keep) {
        const newStart = shiftedStart(s.startTime, tz, row.day as DayId, row.time);
        keptDates.add(toFormFields(newStart, tz).date);
        await tx.danceClass.update({ where: { id: s.id }, data: { ...common, room: venue?.id ? null : row.room || null, startTime: newStart, venueChangedAt: now } });
        moved.push({ id: s.id, title: s.title, oldStart: s.startTime, newStart, emails: s.bookings.map((b) => b.user.email).filter(Boolean), phones: s.bookings.map((b) => b.user.phone) });
      }
      const starts = sessionStarts(now, row.day as DayId, row.time, row.repeat, tz).filter((d) => !keptDates.has(toFormFields(d, tz).date));
      const template = await tx.danceClass.findFirst({ where: { seriesId }, orderBy: { startTime: "desc" } });
      if (template && starts.length) {
        const { id: _id, createdAt: _c, updatedAt: _u, cancelledAt: _x, cancelledReason: _r, venueChangedAt: _v, teacherListSentAt: _t, checkInCode: _k, ...base } = template;
        void _id; void _c; void _u; void _x; void _r; void _v; void _t; void _k;
        await tx.danceClass.createMany({ data: starts.map((startTime) => ({ ...base, ...common, room: venue?.id ? null : row.room || null, startTime })) });
      }
    } else {
      for (const s of series.sessions) {
        const newStart = scheduleChanged ? shiftedStart(s.startTime, tz, row.day as DayId, row.time) : s.startTime;
        const changedForStudents = s.bookings.length > 0 && (scheduleChanged || venueChanged);
        await tx.danceClass.update({
          where: { id: s.id },
          data: { ...common, room: venue?.id ? null : row.room || null, startTime: newStart, ...(changedForStudents ? { venueChangedAt: now } : {}) },
        });
        if (scheduleChanged && s.bookings.length) {
          moved.push({ id: s.id, title: s.title, oldStart: s.startTime, newStart, emails: s.bookings.map((b) => b.user.email).filter(Boolean), phones: s.bookings.map((b) => b.user.phone) });
        }
      }
    }
  });

  if (opts.notify) {
    for (const m of moved) {
      for (const to of m.emails) {
        await sendClassRescheduled({ to, classTitle: m.title, oldStart: m.oldStart, newStart: m.newStart, timezone: tz, classUrl: appUrl(`/first-class/${m.id}`) }).catch((err) =>
          logError("email.classRescheduled", err),
        );
      }
      for (const p of m.phones) {
        await sendSms(p, `${m.title} has a new time: ${formatClassWhen(m.newStart, tz)}. Can't make it? Cancel free in StepUp.`).catch(() => false);
      }
    }
    if (venueChanged && !scheduleChanged && venue) {
      // Bookings stay; everyone booked is told and can cancel free.
      const first = series.sessions.find((s) => s.bookings.length);
      if (first) await moveClass({ id: first.id, seriesId, startTime: first.startTime }, { ...venue, name: row.room && !venue.id ? `${venue.name}, ${row.room}` : venue.name }, true);
    }
    const teacherChanged = prev.teacher && row.teacher && prev.teacher !== row.teacher;
    if (teacherChanged) {
      const t = await db.studioMember.findUnique({ where: { id: row.teacher }, select: { name: true } });
      const next = series.sessions.find((s) => s.bookings.length);
      if (t && next) {
        const c = await db.danceClass.findUnique({
          where: { id: next.id },
          select: { id: true, title: true, startTime: true, timezone: true, studio: { select: { name: true, owner: { select: { email: true } } } }, host: { select: { name: true, displayName: true, email: true } } },
        });
        if (c) await sendToClass(c, null, `${t.name} is teaching this class now.`);
      }
    }
  }
  const n = moved.reduce((s, m) => s + m.emails.length, 0);
  return `${row.title} updated${moved.length ? ` to ${whenLabel(row)}` : ""}.${opts.notify && n ? ` ${n} ${n === 1 ? "student" : "students"} told, and anyone who can't make it can cancel free.` : ""}`;
}

/**
 * A class gone from the sheet: cancel its future dates (refunding and telling
 * anyone booked). It's no longer the sheet's, so adding the row back later
 * makes a new class.
 */
export async function retireSeries(seriesId: string, now = new Date()): Promise<number> {
  const { told } = await cancelSeriesFrom(seriesId, now, "Taken off the timetable");
  await db.classSeries.update({ where: { id: seriesId }, data: { scheduleSourceId: null, importRowKey: null } });
  return told;
}

// ─── The sync ───────────────────────────────────────────────────────────────

export type SyncSummary = {
  sourceId: string;
  studioId: string;
  unchanged?: boolean;
  added: number;
  updated: number;
  waiting: number;
  removed: number;
  error?: string;
};

async function bookedCounts(seriesIds: string[], now: Date) {
  if (!seriesIds.length) return new Map<string, number>();
  const rows = await db.booking.groupBy({
    by: ["classId"],
    where: { status: { in: ["BOOKED", "PENDING_PAYMENT"] }, class: { seriesId: { in: seriesIds }, startTime: { gte: now }, cancelledAt: null } },
    _count: { _all: true },
  });
  const classes = await db.danceClass.findMany({ where: { id: { in: rows.map((r) => r.classId) } }, select: { id: true, seriesId: true } });
  const out = new Map<string, number>();
  for (const r of rows) {
    const s = classes.find((c) => c.id === r.classId)?.seriesId;
    if (s) out.set(s, (out.get(s) ?? 0) + r._count._all);
  }
  return out;
}

const describe = (prev: AppliedRow, next: ReviewRow, kind: string) =>
  kind === "removed"
    ? { from: `${prev.title}, ${whenLabel(prev)}`, to: "removed from your sheet" }
    : kind === "schedule"
      ? { from: whenLabel(prev), to: whenLabel(next) }
      : kind === "venue"
        ? { from: prev.room || prev.venue, to: next.room || next.venue }
        : { from: "", to: "new details" };

/**
 * Sync connected sheets: every active one (the daily cron), or one
 * studio's (dashboard open, Sync now). An unchanged CSV (same SHA-256)
 * writes nothing but its check time.
 */
export async function syncSheets(opts: { studioId?: string; now?: Date; fetcher?: Fetcher } = {}): Promise<SyncSummary[]> {
  const now = opts.now ?? new Date();
  const sources = await db.scheduleSource.findMany({
    where: { kind: "SHEET_CSV", activatedAt: { not: null }, autoSync: true, url: { not: null }, ...(opts.studioId ? { studioId: opts.studioId } : {}), studio: { suspendedAt: null } },
    include: { studio: true },
    take: 500,
  });
  const out: SyncSummary[] = [];
  for (const src of sources) {
    try {
      out.push(await syncOne(src, src.studio, now, opts.fetcher));
    } catch (err) {
      logError("sync.sheet", err, { sourceId: src.id });
      await db.scheduleSource.update({ where: { id: src.id }, data: { lastError: "Something went wrong reading your sheet. We'll try again." } });
      out.push({ sourceId: src.id, studioId: src.studioId, added: 0, updated: 0, waiting: 0, removed: 0, error: "failed" });
    }
  }
  if (!opts.studioId) {
    // Keep the database small: runs older than 30 days go.
    await db.importRun.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 30 * 24 * 60 * 60_000) } } });
  }
  return out;
}

async function syncOne(
  src: { id: string; url: string | null; mapping: Prisma.JsonValue; lastHash: string | null; studioId: string },
  studio: StudioLite,
  now: Date,
  fetcher?: Fetcher,
): Promise<SyncSummary> {
  const base = { sourceId: src.id, studioId: src.studioId, added: 0, updated: 0, waiting: 0, removed: 0 };
  const got = await fetchSheetCsv(src.url!, fetcher);
  if (!got.ok) {
    await db.scheduleSource.update({ where: { id: src.id }, data: { lastError: got.error, lastSyncedAt: now } });
    return { ...base, error: got.error };
  }
  if (got.hash === src.lastHash) {
    await db.scheduleSource.update({ where: { id: src.id }, data: { lastSyncedAt: now, lastError: null } });
    return { ...base, unchanged: true };
  }

  const { ctx, templates } = await importContext(studio, now);
  const { table, mapping } = tableWithMapping(got.text, src.mapping as ColumnMapping);
  // Classes the studio cancelled on StepUp stay cancelled while their row is
  // still in the sheet: they're matched, so not made again, but never changed.
  const linked = await db.classSeries.findMany({ where: { scheduleSourceId: src.id }, select: { id: true, importRow: true, archivedAt: true } });
  const stopped = new Set(linked.filter((i) => i.archivedAt).map((i) => i.id));
  const imported = linked.filter((i) => !i.archivedAt);
  // Classes this sheet made aren't duplicates of themselves.
  const ownTitles = new Set(imported.map((i) => `${String((i.importRow as AppliedRow | null)?.title ?? "").toLowerCase()}`));
  const rows = rowsFromTable(table, mapping).map((r) => matchRow(r, { ...ctx, existing: ctx.existing.filter((e) => !ownTitles.has(e.title.toLowerCase())) }));
  const booked = await bookedCounts(imported.map((i) => i.id), now);
  const prev: Imported[] = linked.filter((i) => i.importRow).map((i) => ({ seriesId: i.id, row: i.importRow as unknown as AppliedRow, booked: booked.get(i.id) ?? 0 }));
  const diff = diffSheet(rows, prev);

  const notes: string[] = [];
  const result = { ...base };
  for (const r of diff.added) {
    if (!r.include) continue;
    const res = await createFromRow(studio, r, ctx, templates, src.id, now);
    if (res.ok) result.added++;
    else notes.push(`${r.title || "A row"}: ${res.why}`);
  }
  for (const ch of diff.changed) {
    if (stopped.has(ch.seriesId)) continue;
    const blockers = rowBlockers({ ...ch.row, dup: false }, ctx);
    if (blockers.length) {
      notes.push(`${ch.row.title}: ${blockers.join(" ")}`);
      continue;
    }
    if (ch.booked === 0) {
      await applyRow(studio, ch.seriesId, ch.row, { notify: false, now });
      result.updated++;
    } else {
      const p = prev.find((x) => x.seriesId === ch.seriesId)!;
      const d = describe(p.row, ch.row, ch.kind);
      await db.scheduleChange.deleteMany({ where: { seriesId: ch.seriesId, status: "PENDING" } });
      await db.scheduleChange.create({
        data: {
          sourceId: src.id,
          seriesId: ch.seriesId,
          field: ch.kind,
          fromValue: d.from,
          toValue: d.to,
          bookedCount: ch.booked,
          row: appliedRow(ch.row) as unknown as Prisma.InputJsonValue,
        },
      });
      result.waiting++;
    }
  }
  for (const gone of diff.removed) {
    if (stopped.has(gone.seriesId)) {
      // Cancelled on StepUp, and now gone from the sheet too: nothing left to keep.
      await db.classSeries.update({ where: { id: gone.seriesId }, data: { scheduleSourceId: null, importRowKey: null } });
      continue;
    }
    if (gone.booked === 0) {
      await retireSeries(gone.seriesId, now);
      result.removed++;
    } else {
      await db.scheduleChange.deleteMany({ where: { seriesId: gone.seriesId, status: "PENDING" } });
      await db.scheduleChange.create({
        data: { sourceId: src.id, seriesId: gone.seriesId, field: "removed", fromValue: `${gone.row.title}, ${whenLabel(gone.row)}`, toValue: "removed from your sheet", bookedCount: gone.booked },
      });
      result.waiting++;
    }
  }

  await db.importRun.create({
    data: {
      sourceId: src.id,
      status: "PUBLISHED",
      raw: { added: result.added, updated: result.updated, waiting: result.waiting, removed: result.removed, notes } as Prisma.InputJsonValue,
      rows: {
        create: rows.map((r) => ({
          data: appliedRow(r) as unknown as Prisma.InputJsonValue,
          uncertain: r.check,
          missing: [],
          rowKey: r.rowKey,
          decision: r.dup ? "DUPLICATE" : r.include ? "INCLUDE" : "SKIP",
        })),
      },
    },
  });
  await db.scheduleSource.update({
    where: { id: src.id },
    data: {
      lastHash: got.hash,
      lastSyncedAt: now,
      lastError: null,
      headers: table[0] ?? [],
      pendingNote: notes.length ? notes.slice(0, 6).join("\n").slice(0, 1500) : null,
    },
  });
  return result;
}

// ─── The approval queue ─────────────────────────────────────────────────────

export async function approveChange(studio: StudioLite, changeId: string): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const ch = await db.scheduleChange.findFirst({ where: { id: changeId, status: "PENDING", source: { studioId: studio.id } } });
  if (!ch) return { ok: false, error: "That change was already dealt with." };
  const claim = await db.scheduleChange.updateMany({ where: { id: ch.id, status: "PENDING" }, data: { status: "APPROVED", resolvedAt: new Date() } });
  if (claim.count !== 1) return { ok: false, error: "That change was already dealt with." };
  if (ch.field === "removed") {
    const told = await retireSeries(ch.seriesId);
    return { ok: true, message: `Class taken off StepUp. ${told} booked ${told === 1 ? "student was" : "students were"} refunded and shown your other classes first.` };
  }
  const message = await applyRow(studio, ch.seriesId, ch.row as unknown as AppliedRow, { notify: true });
  return { ok: true, message };
}

/** "Keep StepUp as is": the sheet's version is noted, so it isn't asked again. */
export async function ignoreChange(studio: StudioLite, changeId: string): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const ch = await db.scheduleChange.findFirst({ where: { id: changeId, status: "PENDING", source: { studioId: studio.id } } });
  if (!ch) return { ok: false, error: "That change was already dealt with." };
  await db.scheduleChange.update({ where: { id: ch.id }, data: { status: "IGNORED", resolvedAt: new Date() } });
  if (ch.field === "removed") {
    // Detach it from the sheet, so it isn't removed on the next sync.
    await db.classSeries.update({ where: { id: ch.seriesId }, data: { scheduleSourceId: null } });
  } else if (ch.row) {
    await db.classSeries.update({ where: { id: ch.seriesId }, data: { importRow: ch.row as Prisma.InputJsonValue } });
  }
  return { ok: true, message: "Kept as it is on StepUp." };
}
