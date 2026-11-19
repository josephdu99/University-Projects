import { redirect } from "next/navigation";
import { requireStudioAccess, studioPerms } from "@/lib/studio-access";
import { loadStatement } from "@/lib/studio-statement";
import { money } from "@/lib/statement";
import { StatementTable } from "@/components/studio/tabs/StatementTable";
import { PrintButton } from "@/components/studio/PrintButton";

export const metadata = { title: "Statement, StepUp" };

/** The month's statement on its own, for printing or saving as a PDF. */
export default async function PrintStatementPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const access = await requireStudioAccess();
  if (!studioPerms(access).payouts) redirect("/studio");
  const { studio } = access;
  const { month } = await searchParams;
  const st = await loadStatement(studio.ownerId, studio.id, studio.timezone, month);
  return (
    <div style={{ background: "#fff", color: "#111", padding: "24px clamp(12px, 3vw, 32px)", borderRadius: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div className="sd-kicker">StepUp statement</div>
          <h1 className="sd-h2" style={{ marginTop: 4 }}>
            {studio.name} · {st.label}
          </h1>
          <div style={{ fontSize: 14 }}>
            {studio.address}, {studio.city}
            {studio.abn ? ` · ABN ${studio.abn}` : ""}
          </div>
        </div>
        <PrintButton auto label="Print or save as PDF" />
      </div>
      <div style={{ fontSize: 14 }}>
        {`Bookings ${money(st.totals.gross)} · Refunds ${money(st.totals.refunds)} · Commission ${money(st.totals.commission)} · GST on commission ${money(
          st.totals.gst,
        )} · To you ${money(st.totals.net)}`}
      </div>
      <StatementTable lines={st.lines} totals={st.totals} tz={studio.timezone} />
    </div>
  );
}
