import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireStudioAccess, studioPerms } from "@/lib/studio-access";
import { money } from "@/lib/statement";
import { paidSince, payoutDates, PAYOUT_DAY_LABEL } from "@/lib/studio-data";
import { loadStatement } from "@/lib/studio-statement";
import { stepupAbn } from "@/lib/stepup-tax";
import { stripeConfigured, PLATFORM_FEE_PERCENT } from "@/lib/stripe";
import { shortDay } from "@/lib/studio-format";
import { openPayoutDashboardAction, refreshPayoutStatusAction, startPayoutOnboardingAction } from "@/lib/actions/payout-actions";
import { TabTitle } from "@/components/studio/tabs/TabTitle";
import { PayoutDayPicker } from "@/components/studio/tabs/PayoutDayPicker";
import { StatementTable } from "@/components/studio/tabs/StatementTable";

export const metadata = { title: "Payouts, StepUp" };

/**
 * Payouts: Stripe Connect Express (none → finishing → connected), a weekly
 * payout day, and the monthly statement with every booking tagged agent,
 * seller or refund. Only the account the money goes to sees this tab.
 */
export default async function StudioPayoutsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const access = await requireStudioAccess();
  if (!studioPerms(access).payouts) redirect("/studio");
  const { studio } = access;
  const tz = studio.timezone;
  const { month } = await searchParams;

  const [payout, st] = await Promise.all([
    db.payoutAccount.findUnique({ where: { userId: studio.ownerId } }),
    loadStatement(studio.ownerId, studio.id, tz, month),
  ]);
  const state = !payout ? "none" : payout.chargesEnabled && payout.payoutsEnabled ? "on" : "pending";
  const dates = payoutDates(studio.payoutDay);
  const nextCents = state === "on" ? await paidSince(studio.ownerId, dates.last) : 0;
  const nextLabel = `${PAYOUT_DAY_LABEL[studio.payoutDay] ?? "Thu"} ${shortDay(dates.next, tz).replace(/^\w+ /, "")}`;
  const abn = stepupAbn();

  return (
    <>
      <TabTitle kicker="Payouts" title="Money in, cleanly." />

      {!stripeConfigured() && (
        <div className="sd-card sd-hint" style={{ padding: "16px 22px", marginBottom: 16 }}>
          Payments aren&apos;t switched on for StepUp yet, so payouts can&apos;t be set up. Free and trial classes work as normal.
        </div>
      )}

      {state === "none" && (
        <section className="sd-card" style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <h2 className="sd-h3">Connect payouts with Stripe</h2>
          <p style={{ margin: 0, fontSize: 15, color: "oklch(35% 0.02 60)" }}>
            Stripe Connect Express collects your ABN, ID and bank details on Stripe&apos;s own secure page. StepUp never sees or stores them. It
            takes about five minutes.
          </p>
          <form action={startPayoutOnboardingAction}>
            <button type="submit" className="sd-btn" style={{ background: "oklch(66% 0.19 35)" }} disabled={!stripeConfigured()}>
              Continue to Stripe
            </button>
          </form>
        </section>
      )}
      {state === "pending" && (
        <section className="sd-card" style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <h2 className="sd-h3">Finishing on Stripe…</h2>
          <p style={{ margin: 0, fontSize: 15, color: "oklch(35% 0.02 60)" }}>
            {payout?.detailsSubmitted
              ? "Stripe has your details and is checking them. This usually takes a few minutes, sometimes a day."
              : "Stripe still needs a few details before you can take payments. Pick up where you left off."}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <form action={startPayoutOnboardingAction}>
              <button type="submit" className="sd-btn">
                Continue on Stripe
              </button>
            </form>
            <form action={refreshPayoutStatusAction}>
              <button type="submit" className="sd-btn-ghost">
                I&apos;ve finished on Stripe
              </button>
            </form>
          </div>
        </section>
      )}
      {state === "on" && (
        <section
          className="sd-card"
          style={{ padding: "24px 28px", display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 18, marginBottom: 20 }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span>
              <span className="sd-chip" style={{ background: "oklch(93% 0.06 150)", color: "oklch(32% 0.08 150)" }}>
                STRIPE CONNECTED
              </span>
            </span>
            <span style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 800, fontSize: 24 }}>{`Next payout ${nextLabel}: ${money(nextCents)}`}</span>
            <span className="sd-hint">Weekly, on the same day every week, so you can plan around it. Stripe may hold a new account&apos;s first payout a little longer.</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 12 }}>
            <PayoutDayPicker day={studio.payoutDay} />
            <form action={openPayoutDashboardAction}>
              <button type="submit" className="sd-btn-ghost" style={{ height: 54 }}>
                Stripe dashboard
              </button>
            </form>
          </div>
        </section>
      )}

      <section aria-labelledby="stmt-title" className="sd-card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 id="stmt-title" className="sd-h3">
              Monthly statement · {st.label}
            </h2>
            <p className="sd-hint" style={{ margin: "4px 0 0" }}>
              Every booking, tagged as agent or seller, because each is reported differently.
            </p>
          </div>
          <div className="no-print" style={{ display: "flex", gap: 6 }}>
            <Link href={`/studio/payouts?month=${st.prevKey}`} className="sd-btn-ghost" aria-label="Previous month" style={{ padding: "8px 14px" }}>
              ←
            </Link>
            {st.nextKey && (
              <Link href={`/studio/payouts?month=${st.nextKey}`} className="sd-btn-ghost" aria-label="Next month" style={{ padding: "8px 14px" }}>
                →
              </Link>
            )}
          </div>
        </div>
        <div className="no-print" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <a href={`/studio/csv/statement?month=${st.key}`} className="sd-btn-ghost">
            Download CSV
          </a>
          <a href={`/studio/payouts/print?month=${st.key}`} target="_blank" rel="noopener" className="sd-btn-ghost">
            Download PDF
          </a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: 10 }}>
          {[
            ["Bookings", money(st.totals.gross)],
            ["Refunds", money(st.totals.refunds)],
            ["Commission", money(st.totals.commission)],
            ["GST on commission", money(st.totals.gst)],
            ["To you", money(st.totals.net)],
          ].map(([label, value]) => (
            <div key={label} style={{ padding: "12px 14px", borderRadius: 14, background: "oklch(96% 0.01 70)" }}>
              <div className="sd-hint">{label}</div>
              <div style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 800, fontSize: 19 }}>{value}</div>
            </div>
          ))}
        </div>
        {st.gstRegistered ? (
          <details className="no-print">
            <summary className="sd-btn-ghost" style={{ display: "inline-flex", listStyle: "none" }}>
              Tax invoice
            </summary>
            <div id="tax-invoice" style={{ marginTop: 12, padding: "16px 18px", borderRadius: 16, border: "1px solid oklch(88% 0.01 70)", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
                <strong>Tax invoice {st.invoiceNo}</strong>
                <span className="sd-hint">Issued for {st.label}</span>
              </div>
              <div style={{ fontSize: 14 }}>
                From: StepUp{abn ? ` · ABN ${abn}` : ""}
                <br />
                To: {studio.name} · {studio.address}, {studio.city}
                {studio.abn ? ` · ABN ${studio.abn}` : ""}
              </div>
              <table className="sd-tbl">
                <tbody>
                  <tr>
                    <td>Booking commission, {st.label}</td>
                    <td className="num">{money(st.totals.commission)}</td>
                  </tr>
                  <tr>
                    <td>GST on commission</td>
                    <td className="num">{money(st.totals.gst)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total (deducted from your payouts)</td>
                    <td className="num">{money(st.totals.commission + st.totals.gst)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </details>
        ) : (
          <div className="sd-hint">
            {`StepUp isn't registered for GST yet, so there's no GST on its ${PLATFORM_FEE_PERCENT}% commission and no tax invoice. A tax invoice appears here each month once it registers.`}
          </div>
        )}
        <StatementTable lines={st.lines} totals={st.totals} tz={tz} />
      </section>

      <section aria-labelledby="agent-title" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 16 }}>
        <div className="sd-card" style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 id="agent-title" className="sd-h3" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="sd-chip" style={{ background: "oklch(94% 0.05 85)", color: "oklch(38% 0.09 70)" }}>
              Agent
            </span>
            Your own listings
          </h2>
          <p style={{ margin: 0, fontSize: 14.5, color: "oklch(35% 0.02 60)" }}>
            StepUp is your booking agent. You supply the class, so the GST on the class price is yours. StepUp supplies a booking service to you,
            so any GST on the commission is StepUp&apos;s, and it&apos;s shown on your monthly tax invoice once StepUp is registered.
          </p>
        </div>
        <div className="sd-card" style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 className="sd-h3" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="sd-chip" style={{ background: "oklch(93% 0.03 250)", color: "oklch(35% 0.07 250)" }}>
              Seller
            </span>
            StepUp&apos;s own sales
          </h2>
          <p style={{ margin: 0, fontSize: 14.5, color: "oklch(35% 0.02 60)" }}>
            StepUp class packs and credits used at your studio. StepUp sells these, charges GST on the full price, and pays you the agreed amount
            per spot with no commission taken. StepUp doesn&apos;t sell packs yet, so you won&apos;t see these lines for now.
          </p>
        </div>
      </section>
    </>
  );
}
