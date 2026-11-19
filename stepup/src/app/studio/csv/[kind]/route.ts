import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { getStudioAccess, studioPerms, canRunClass } from "@/lib/studio-access";
import { csvResponse, fileSlug } from "@/lib/csv";
import { classSheet, statementEntries, studioStudents, teacherPayReport } from "@/lib/studio-data";
import { dollars, parseMonthKey, statementLines } from "@/lib/statement";
import { dayRange, gstRegistered, monthRange, thisMonthKey } from "@/lib/stepup-tax";
import { ROLE_LABEL, type DanceRole } from "@/lib/partner-roles";
import { toFormFields } from "@/lib/time";

const STATUS: Record<string, string> = {
  BOOKED: "Booked",
  ATTENDED: "Attended",
  NO_SHOW: "No-show",
  PENDING_PAYMENT: "Paying",
};

function day(d: Date, tz: string) {
  return toFormFields(d, tz).date;
}

/**
 * The studio dashboard's downloads: a class list, every student, a month's
 * statement and the teacher pay report. Each checks who's asking: class lists
 * for anyone who can run the class, the rest for the studio's admins, and the
 * statement only for the account the money goes to.
 */
export async function GET(req: Request, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  const url = new URL(req.url);
  const user = await getSessionUser();
  if (!user) return new Response("Sign in first.", { status: 401 });

  if (kind === "roster") {
    const classId = url.searchParams.get("class") ?? "";
    const c = await db.danceClass.findUnique({
      where: { id: classId },
      select: { hostId: true, studioId: true, teacherMemberId: true },
    });
    if (!c || !(await canRunClass(user, c))) return new Response("Not found.", { status: 404 });
    const s = await classSheet(classId, c.hostId);
    if (!s) return new Response("Not found.", { status: 404 });
    const rows: unknown[][] = [["Name", "Email", "Mobile", "Role", "First class here", "Note", "Status"]];
    for (const r of s.roster) {
      rows.push([r.name, r.email, r.phone ?? "", r.role ? ROLE_LABEL[r.role as DanceRole] ?? r.role : "", r.first ? "Yes" : "No", r.note ?? "", STATUS[r.status] ?? r.status]);
    }
    for (const w of s.walkIns) rows.push([w.name, "", "", w.role ? ROLE_LABEL[w.role as DanceRole] ?? w.role : "", "", "", "Walk-in"]);
    return csvResponse(rows, `${fileSlug(s.title)}-${day(s.startTime, s.timezone)}.csv`);
  }

  const access = await getStudioAccess(user.id);
  if (!access) return new Response("Not found.", { status: 404 });
  const { studio } = access;
  const hostId = studio.ownerId;
  const tz = studio.timezone;

  if (kind === "students") {
    const students = await studioStudents(hostId);
    const rows: unknown[][] = [["Name", "Email", "Mobile", "First class", "Classes", "No-shows (60 days)", "Status"]];
    for (const s of students) rows.push([s.name, s.email, s.phone ?? "", day(s.firstClass, tz), s.classes, s.noShows, s.status]);
    return csvResponse(rows, `${fileSlug(studio.name)}-students.csv`);
  }

  if (kind === "statement") {
    if (!studioPerms(access).payouts) return new Response("Only the account holder sees statements.", { status: 403 });
    const key = url.searchParams.get("month") ?? thisMonthKey(new Date(), tz);
    const m = parseMonthKey(key);
    if (!m) return new Response("Bad month.", { status: 400 });
    const { from, to } = monthRange(m.year, m.month, tz);
    const lines = statementLines(await statementEntries(hostId, from, to), gstRegistered());
    const rows: unknown[][] = [["Date", "Class", "Student", "Type", "Amount", "Commission", "GST on commission", "To you"]];
    for (const l of lines) {
      rows.push([day(l.date, tz), l.classTitle, l.student, l.type === "AGENT" ? "Agent" : l.type === "SELLER" ? "Seller" : "Refund", dollars(l.amountCents), dollars(l.commissionCents), dollars(l.gstCents), dollars(l.netCents)]);
    }
    return csvResponse(rows, `${fileSlug(studio.name)}-statement-${key}.csv`);
  }

  if (kind === "pay") {
    const fromKey = url.searchParams.get("from") ?? "";
    const toKey = url.searchParams.get("to") ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromKey) || !/^\d{4}-\d{2}-\d{2}$/.test(toKey)) return new Response("Bad dates.", { status: 400 });
    const { from, to } = dayRange(fromKey, toKey, tz);
    const report = await teacherPayReport(hostId, from, to);
    const rows: unknown[][] = [["Teacher", "Class", "Date", "StepUp bookings", "Attended"]];
    for (const r of report) rows.push([r.teacher, r.title, day(r.startTime, r.timezone), r.booked, r.attended]);
    return csvResponse(rows, `teacher-pay-report-${fromKey}-to-${toKey}.csv`);
  }

  return new Response("Not found.", { status: 404 });
}
