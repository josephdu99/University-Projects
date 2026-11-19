import { db } from "@/lib/db";
import { requireStudioAccess } from "@/lib/studio-access";
import { newStudentValue, studioStudents, termWindow } from "@/lib/studio-data";
import { NO_SHOW_RULE } from "@/lib/policies";
import { money } from "@/lib/statement";
import { shortDate, shortDay } from "@/lib/studio-format";
import { TabTitle } from "@/components/studio/tabs/TabTitle";
import { PassOfferCard } from "@/components/studio/tabs/PassOfferCard";
import { passAudience } from "@/lib/studio-ops";

export const metadata = { title: "Dancers, StepUp" };

const STATUS_CHIP: Record<string, { background: string; color: string }> = {
  "Prepay required": { background: "oklch(93% 0.05 30)", color: "oklch(42% 0.15 30)" },
  Warned: { background: "oklch(94% 0.06 85)", color: "oklch(40% 0.1 70)" },
  New: { background: "oklch(93% 0.06 150)", color: "oklch(32% 0.08 150)" },
  Regular: { background: "oklch(93% 0.03 250)", color: "oklch(35% 0.07 250)" },
};

/**
 * Dancers: the Studio Data Promise in practice. Everyone who's booked the
 * studio through StepUp, with their contact details, the value StepUp
 * brought this term, and the studio's own pass offer (no commission).
 */
export default async function StudioDancersPage() {
  const { studio } = await requireStudioAccess();
  const hostId = studio.ownerId;
  const tz = studio.timezone;
  const [students, term, passes, offers, first, all] = await Promise.all([
    studioStudents(hostId),
    termWindow(studio.id, studio.createdAt),
    db.studioPass.findMany({ where: { studioId: studio.id, archivedAt: null }, orderBy: { createdAt: "asc" } }),
    db.passOffer.findMany({ where: { studioId: studio.id }, orderBy: { createdAt: "desc" }, take: 5, include: { pass: { select: { name: true } } } }),
    passAudience(hostId, studio.id, "FIRST"),
    passAudience(hostId, studio.id, "ALL"),
  ]);
  const value = await newStudentValue(hostId, term.start);
  const sorted = [...students].sort((a, b) => b.firstClass.getTime() - a.firstClass.getTime());

  return (
    <>
      <TabTitle kicker="Dancers" title="Your students are yours.">
        <a href="/studio/csv/students" className="sd-btn-ghost">
          Export CSV
        </a>
      </TabTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 16, marginBottom: 16 }}>
        <div style={{ padding: "24px 26px", borderRadius: 24, background: "oklch(94% 0.05 85)", display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="sd-kicker" style={{ color: "oklch(38% 0.09 70)" }}>
            This term
          </span>
          <span style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 800, fontSize: 24, lineHeight: 1.2 }}>
            {value.count === 0
              ? "No new students through StepUp yet this term."
              : `StepUp brought you ${value.count} new ${value.count === 1 ? "student" : "students"} worth ${money(value.cents)}.`}
          </span>
          <span className="sd-hint" style={{ color: "oklch(38% 0.05 70)" }}>
            {`Counted from StepUp bookings at your studio ${term.label} ${shortDate(term.start, tz)}: people whose first booking with you fell in that time, and what they've paid since.`}
          </span>
        </div>
        <div className="sd-card" style={{ padding: "24px 26px" }}>
          <div className="sd-h3">The Studio Data Promise</div>
          <ul style={{ margin: "12px 0 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8, fontSize: 14.5 }}>
            <li>
              After every booking you get the student&apos;s <strong>name, email and mobile</strong>. Students agree to this when they book.
            </li>
            <li>
              Market to them directly, including your own passes. <strong>No commission</strong> on that.
            </li>
            <li>
              <strong>Same studio first:</strong> if you cancel a class, students see your other classes before anyone else&apos;s.
            </li>
            <li>
              StepUp never markets other studios to a student <em>because</em> they booked with you.
            </li>
          </ul>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <PassOfferCard
          studioName={studio.name}
          passes={passes.map((p) => ({ id: p.id, name: p.name, priceCents: p.priceCents, link: p.link }))}
          firstCount={first.length}
          allCount={all.length}
          saved={{ auto: studio.passOfferAuto, passId: studio.passOfferPassId, message: studio.passOfferMessage }}
          history={offers.map((o) => ({
            id: o.id,
            line: `${shortDay(o.createdAt, tz)} · ${o.pass.name} · ${o.recipients} ${o.recipients === 1 ? "student" : "students"}${
              o.audience === "AUTO" ? " · automatic" : o.audience === "FIRST" ? " · after their first class" : ""
            }`,
          }))}
        />
      </div>

      <section aria-labelledby="dancers-title">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 14 }}>
          <h2 id="dancers-title" className="sd-h2">
            Everyone who&apos;s booked you
          </h2>
          <span className="sd-hint">{NO_SHOW_RULE}</span>
        </div>
        <div className="sd-card sd-scroll-x">
          {sorted.length === 0 ? (
            <div className="sd-hint" style={{ padding: "22px 24px" }}>
              Students show here after their first booking, with their name, email and mobile.
            </div>
          ) : (
            <table className="sd-tbl">
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Email</th>
                  <th scope="col">Mobile</th>
                  <th scope="col">First class</th>
                  <th scope="col" className="num">
                    Classes
                  </th>
                  <th scope="col" className="num">
                    No-shows (60 days)
                  </th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>
                      <a href={`mailto:${s.email}`} style={{ color: "inherit" }}>
                        {s.email}
                      </a>
                    </td>
                    <td>{s.phone ?? <span className="sd-hint">Not given</span>}</td>
                    <td>{shortDate(s.firstClass, tz)}</td>
                    <td className="num">{s.classes}</td>
                    <td className="num">{s.noShows}</td>
                    <td>
                      <span className="sd-chip" style={STATUS_CHIP[s.status] ?? STATUS_CHIP.New}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
