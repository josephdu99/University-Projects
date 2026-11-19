/**
 * The monthly statement a studio's bookkeeper reads: gross bookings, refunds,
 * commission, GST on commission and net payout, then a line per booking,
 * each tagged Agent, Seller or Refund because each is reported differently.
 *
 * Commission is whatever StepUp actually took on the payment (Stripe's
 * application fee), not a rate recomputed here. Whether part of it is GST
 * depends on StepUp being registered for GST, which it must be once its
 * turnover reaches $75,000. Until then it charges none, and the statement
 * says GST $0.00 rather than inventing a split.
 */

export type EntryType = "AGENT" | "SELLER" | "REFUND";

export type StatementEntry = {
  date: Date;
  classTitle: string;
  student: string;
  type: EntryType;
  /** Positive for a sale, negative for a refund. */
  amountCents: number;
  /** StepUp's fee on it: positive on a sale, negative when refunded with it. */
  feeCents: number;
};

export type StatementLine = StatementEntry & {
  commissionCents: number;
  gstCents: number;
  netCents: number;
};

/** A fee split into commission and the GST inside it (1/11 when registered). */
export function splitFee(feeCents: number, gstRegistered: boolean): { commission: number; gst: number } {
  if (!gstRegistered) return { commission: feeCents, gst: 0 };
  const gst = Math.round(feeCents / 11);
  return { commission: feeCents - gst, gst };
}

export function statementLines(entries: StatementEntry[], gstRegistered: boolean): StatementLine[] {
  return [...entries]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((e) => {
      const { commission, gst } = splitFee(e.feeCents, gstRegistered);
      return {
        ...e,
        commissionCents: commission,
        gstCents: gst,
        netCents: e.amountCents - commission - gst,
      };
    });
}

export function statementTotals(lines: StatementLine[]) {
  const sum = (f: (l: StatementLine) => number) => lines.reduce((s, l) => s + f(l), 0);
  return {
    gross: sum((l) => (l.amountCents > 0 ? l.amountCents : 0)),
    refunds: sum((l) => (l.amountCents < 0 ? l.amountCents : 0)),
    commission: sum((l) => l.commissionCents),
    gst: sum((l) => l.gstCents),
    net: sum((l) => l.netCents),
  };
}

/** $1,234.50, with a minus sign in front of the dollar sign. */
export function money(cents: number): string {
  const abs = Math.abs(cents) / 100;
  return `${cents < 0 ? "-" : ""}$${abs.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function dollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** The first instant of a month and of the next, in a zone ("2026-10"). */
export function parseMonthKey(key: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12 || year < 2020 || year > 2100) return null;
  return { year, month };
}

export function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
