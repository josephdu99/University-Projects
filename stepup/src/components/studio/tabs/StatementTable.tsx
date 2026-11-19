import { money, type StatementLine } from "@/lib/statement";
import { shortDay } from "@/lib/studio-format";

const TYPE_CHIP = {
  AGENT: { background: "oklch(94% 0.05 85)", color: "oklch(38% 0.09 70)", label: "Agent" },
  SELLER: { background: "oklch(93% 0.03 250)", color: "oklch(35% 0.07 250)", label: "Seller" },
  REFUND: { background: "oklch(93% 0.05 30)", color: "oklch(42% 0.15 30)", label: "Refund" },
} as const;

export function StatementTable({
  lines,
  totals,
  tz,
}: {
  lines: StatementLine[];
  totals: { gross: number; refunds: number; commission: number; gst: number; net: number };
  tz: string;
}) {
  if (lines.length === 0) return <div className="sd-hint">No bookings or refunds this month.</div>;
  return (
    <div className="sd-scroll-x">
      <table className="sd-tbl">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Class</th>
            <th scope="col">Student</th>
            <th scope="col">Type</th>
            <th scope="col" className="num">
              Amount
            </th>
            <th scope="col" className="num">
              Commission
            </th>
            <th scope="col" className="num">
              GST on comm.
            </th>
            <th scope="col" className="num">
              To you
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => {
            const t = TYPE_CHIP[l.type];
            return (
              <tr key={i}>
                <td style={{ whiteSpace: "nowrap" }}>{shortDay(l.date, tz)}</td>
                <td>{l.classTitle}</td>
                <td>{l.student}</td>
                <td>
                  <span className="sd-chip" style={{ background: t.background, color: t.color }}>
                    {t.label}
                  </span>
                </td>
                <td className="num">{money(l.amountCents)}</td>
                <td className="num">{money(l.commissionCents)}</td>
                <td className="num">{money(l.gstCents)}</td>
                <td className="num">{money(l.netCents)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4}>Totals</td>
            <td className="num">{money(totals.gross + totals.refunds)}</td>
            <td className="num">{money(totals.commission)}</td>
            <td className="num">{money(totals.gst)}</td>
            <td className="num">{money(totals.net)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
