import type { SheetProps } from "@/components/studio/ClassSheet";
import type { ClassSheetData } from "@/lib/studio-data";
import { MARK_FROM_MINUTES } from "@/lib/attendance";
import { textKeyFor } from "@/lib/text-commands";
import { formatClassWhen } from "@/lib/time";
import { sentAt } from "@/lib/studio-format";

/** A class sheet's data, shaped for the dashboard or a teacher's class list. */
export function toSheetProps(s: ClassSheetData, opts: { canManage: boolean; now?: Date }): SheetProps {
  const now = opts.now ?? new Date();
  return {
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
    canManage: opts.canManage,
  };
}
