import { headers } from "next/headers";
import { db } from "@/lib/db";
import { memberRoleLine, requireStudioAccess, studioPerms } from "@/lib/studio-access";
import { TEAM_ROLE_LABEL, type TeamRole } from "@/lib/team";
import { WWCC_REMINDER_DAYS, wwccCurrent } from "@/lib/wwcc";
import { smsNumberLabel } from "@/lib/sms";
import { teacherPayReport } from "@/lib/studio-data";
import { dayRange } from "@/lib/stepup-tax";
import { dateKeyInTimeZone, addDaysToDateString } from "@/lib/time";
import { initials, shortDate, shortDay } from "@/lib/studio-format";
import { StudioBanner, StudioPanelProvider } from "@/components/studio/StudioPanels";
import { InvitePanel } from "@/components/studio/InvitePanel";
import { TeamRoster, type RosterMember } from "@/components/studio/tabs/TeamRoster";
import { TabTitle } from "@/components/studio/tabs/TabTitle";

export const metadata = { title: "Team, StepUp" };

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export default async function StudioTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; from?: string; to?: string }>;
}) {
  const access = await requireStudioAccess();
  const { user, studio } = access;
  const perms = studioPerms(access);
  const params = await searchParams;
  const tz = studio.timezone;
  const now = new Date();

  const today = dateKeyInTimeZone(now, tz);
  const toKey = params.to && DAY_KEY.test(params.to) ? params.to : today;
  const fromKey = params.from && DAY_KEY.test(params.from) && params.from <= toKey ? params.from : addDaysToDateString(toKey, -27);
  const range = dayRange(fromKey, toKey, tz);

  const [members, owner, report, h] = await Promise.all([
    db.studioMember.findMany({ where: { studioId: studio.id }, orderBy: { createdAt: "asc" } }),
    db.user.findUnique({ where: { id: studio.ownerId }, select: { email: true } }),
    teacherPayReport(studio.ownerId, range.from, range.to),
    headers(),
  ]);

  const expired = (m: { inviteExpiresAt: Date | null }) => !m.inviteExpiresAt || m.inviteExpiresAt.getTime() < now.getTime();
  const soon = now.getTime() + WWCC_REMINDER_DAYS * 24 * 60 * 60_000;
  const mine = members.find((m) => m.userId === user.id) ?? null;
  const ordered = [...(mine ? [mine] : []), ...members.filter((m) => m.id !== mine?.id)];

  const rows: RosterMember[] = ordered.map((m) => {
    const isOwner = m.role === "OWNER" || m.userId === studio.ownerId;
    const role = (isOwner ? "OWNER" : m.role) as RosterMember["role"];
    const status: RosterMember["status"] =
      m.id === mine?.id ? "You" : m.status === "ACTIVE" ? "Joined" : expired(m) ? "Invite expired" : "Invite sent";
    const label = TEAM_ROLE_LABEL[(m.role as TeamRole) ?? "TEACHER"] ?? "Teacher";
    const meta =
      m.status === "ACTIVE"
        ? `${memberRoleLine(role, m.teaches)} · ${m.contact}`
        : expired(m)
          ? `${label} · ${m.contact} · invite ran out, send it again to make a new code`
          : `${label} · ${m.contact} · code ${m.inviteCode} · runs out ${shortDate(m.inviteExpiresAt!, tz)}`;
    return {
      id: m.id,
      name: m.name,
      initials: initials(m.name),
      meta,
      isOwner,
      isYou: m.id === mine?.id,
      role,
      teaches: m.teaches,
      status,
      wwcc: {
        verified: Boolean(m.wwccVerifiedAt && m.wwccNumber),
        meta: m.wwccNumber && m.wwccExpiry ? `${m.wwccNumber} · expires ${shortDate(m.wwccExpiry, tz)}` : "",
        expiringSoon: Boolean(m.wwccExpiry && m.wwccExpiry.getTime() < soon && m.wwccExpiry.getTime() > now.getTime()),
        expired: Boolean(m.wwccVerifiedAt && !wwccCurrent(m, now)),
      },
    };
  });
  // Without a membership row of its own, the account holder still shows first.
  if (!mine && access.isAccountHolder) {
    rows.unshift({
      id: "you",
      name: user.name ?? "You",
      initials: initials(user.name ?? "You"),
      meta: `Owner · ${owner?.email ?? ""}`,
      isOwner: true,
      isYou: true,
      role: "OWNER",
      teaches: false,
      status: "You",
      wwcc: { verified: false, meta: "", expiringSoon: false, expired: false },
    });
  }

  const totals = new Map<string, { classes: number; booked: number; attended: number }>();
  for (const r of report) {
    const t = totals.get(r.teacher) ?? { classes: 0, booked: 0, attended: 0 };
    t.classes++;
    t.booked += r.booked;
    t.attended += r.attended;
    totals.set(r.teacher, t);
  }

  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const number = smsNumberLabel();

  return (
    <StudioPanelProvider initial={params.invite === "1" ? "invite" : null}>
      <TabTitle kicker="Team" title="Teachers and permissions" />
      <StudioBanner />

      <div className="sd-card sd-scroll-x" style={{ marginBottom: 28 }}>
        <table className="sd-tbl">
          <caption className="sd-sr">What each role can do</caption>
          <thead>
            <tr>
              <th scope="col">Role</th>
              <th scope="col">Can do</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 700 }}>Owner</td>
              <td>Everything, including payouts and bank details</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700 }}>Manager</td>
              <td>Timetable, cancellations and messages. No bank details or payouts.</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700 }}>Teacher</td>
              <td>Only their own classes and class lists, and cancel by text</td>
            </tr>
          </tbody>
        </table>
      </div>

      <section aria-labelledby="team-title" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 14 }}>
          <h2 id="team-title" className="sd-h2">
            Your teachers
          </h2>
          <span className="sd-hint">
            {rows.length} {rows.length === 1 ? "person" : "people"}
          </span>
        </div>
        <div className="sd-card" style={{ overflow: "hidden", marginBottom: 14 }}>
          <TeamRoster rows={rows} canChangeRoles={perms.changeRoles} />
        </div>
        <InvitePanel studioName={studio.name} inviterName={user.name ?? studio.name} ownerTeaches={mine?.teaches ?? false} origin={`${proto}://${host}`} />
        <p className="sd-hint" style={{ margin: "12px 0 0" }}>
          Teachers of kids&apos; classes need a Working With Children Check, verified with the NSW Office of the Children&apos;s Guardian before the
          class goes live. We store the expiry date and remind you 30 days before it runs out.
        </p>
      </section>

      <section aria-labelledby="text-title" className="sd-card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        <h2 id="text-title" className="sd-h3">
          Teachers can run classes by text
        </h2>
        {number ? (
          <p style={{ margin: 0, fontSize: 14.5 }}>
            From the mobile on their team profile, to <strong>{number}</strong>. StepUp replies to confirm before anything is sent.
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: 14.5 }}>
            Once StepUp&apos;s text number is switched on, teachers text these from the mobile on their team profile. StepUp replies to confirm
            before anything is sent.
          </p>
        )}
        {[
          ["cancel thu salsa", "Cancels the class and refunds everyone"],
          ["msg thu salsa: we're in studio B", "Messages everyone booked"],
          ["move thu salsa to redfern hall", "Changes the venue for that class"],
        ].map(([cmd, what]) => (
          <div key={cmd} style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px 14px" }}>
            <code style={{ fontSize: 14, padding: "4px 10px", borderRadius: 8, background: "oklch(95% 0.01 70)" }}>{cmd}</code>
            <div className="sd-hint">{what}</div>
          </div>
        ))}
      </section>

      <section aria-labelledby="pay-title" className="sd-card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <h2 id="pay-title" className="sd-h3">
            Teacher pay report
          </h2>
          <p className="sd-hint" style={{ margin: "4px 0 0" }}>
            Classes taught and StepUp bookings for each class. You calculate and pay teachers yourself.
          </p>
        </div>
        <form method="get" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>From</span>
            <input className="su-fld" type="date" name="from" defaultValue={fromKey} style={{ height: 46 }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>To</span>
            <input className="su-fld" type="date" name="to" defaultValue={toKey} style={{ height: 46 }} />
          </label>
          <button type="submit" className="sd-btn-ghost">
            Show
          </button>
          <a href={`/studio/csv/pay?from=${fromKey}&to=${toKey}`} className="sd-btn-ghost">
            Export CSV
          </a>
        </form>
        {report.length === 0 ? (
          <div className="sd-hint">No classes in this date range.</div>
        ) : (
          <div className="sd-scroll-x">
            <table className="sd-tbl">
              <thead>
                <tr>
                  <th scope="col">Teacher</th>
                  <th scope="col">Class</th>
                  <th scope="col">Date</th>
                  <th scope="col" className="num">
                    StepUp bookings
                  </th>
                  <th scope="col" className="num">
                    Attended
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.map((r) => (
                  <tr key={r.id}>
                    <td>{r.teacher}</td>
                    <td>{r.title}</td>
                    <td>{shortDay(r.startTime, r.timezone)}</td>
                    <td className="num">{r.booked}</td>
                    <td className="num">{r.attended}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {[...totals.entries()].map(([teacher, t]) => (
                  <tr key={teacher}>
                    <td>{teacher}</td>
                    <td>
                      {t.classes} {t.classes === 1 ? "class" : "classes"}
                    </td>
                    <td />
                    <td className="num">{t.booked}</td>
                    <td className="num">{t.attended}</td>
                  </tr>
                ))}
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </StudioPanelProvider>
  );
}
