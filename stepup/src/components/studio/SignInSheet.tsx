import { ROLE_LABEL, type DanceRole } from "@/lib/partner-roles";
import { formatClassWhenLong } from "@/lib/time";
import type { ClassSheetData } from "@/lib/studio-data";
import { PrintButton } from "./PrintButton";

/** A paper sign-in sheet: one line per booked student, then blank lines for walk-ins. */
export function SignInSheet({ s, auto }: { s: ClassSheetData; auto: boolean }) {
  const rows = s.roster.filter((r) => r.status !== "PENDING_PAYMENT");
  const blanks = Math.max(4, 8 - s.walkIns.length);
  return (
    <div style={{ background: "#fff", color: "#111", padding: "24px clamp(12px, 3vw, 32px)", borderRadius: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div className="sd-kicker">Sign-in sheet</div>
          <h1 className="sd-h2" style={{ marginTop: 4 }}>
            {s.title}
          </h1>
          <div style={{ fontSize: 14, marginTop: 4 }}>
            {formatClassWhenLong(s.startTime, s.timezone)} · {s.venueName} · with {s.teacherName}
          </div>
          {s.roleSummary && <div style={{ fontSize: 14, marginTop: 2 }}>{s.roleSummary}</div>}
        </div>
        <PrintButton auto={auto} />
      </div>
      <table className="sd-tbl" style={{ fontSize: 14 }}>
        <thead>
          <tr>
            <th scope="col" style={{ width: 32 }}>
              #
            </th>
            <th scope="col">Name</th>
            <th scope="col">Role</th>
            <th scope="col">1st class</th>
            <th scope="col">Note</th>
            <th scope="col" style={{ width: "28%" }}>
              Signature
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.bookingId}>
              <td>{i + 1}</td>
              <td style={{ fontWeight: 600 }}>{r.name}</td>
              <td>{r.role ? ROLE_LABEL[r.role as DanceRole] ?? r.role : ""}</td>
              <td>{r.first ? "Yes" : ""}</td>
              <td>{r.note ?? ""}</td>
              <td style={{ borderBottom: "1px solid #999" }} />
            </tr>
          ))}
          {s.walkIns.map((w, i) => (
            <tr key={w.id}>
              <td>{rows.length + i + 1}</td>
              <td style={{ fontWeight: 600 }}>{w.name} (walk-in)</td>
              <td>{w.role ? ROLE_LABEL[w.role as DanceRole] ?? w.role : ""}</td>
              <td />
              <td />
              <td style={{ borderBottom: "1px solid #999" }} />
            </tr>
          ))}
          {Array.from({ length: blanks }, (_, i) => (
            <tr key={`blank-${i}`}>
              <td>{rows.length + s.walkIns.length + i + 1}</td>
              <td style={{ height: 34 }} />
              <td />
              <td />
              <td />
              <td style={{ borderBottom: "1px solid #999" }} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
