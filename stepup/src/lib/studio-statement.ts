import { statementEntries } from "@/lib/studio-data";
import { monthLabel, parseMonthKey, statementLines, statementTotals } from "@/lib/statement";
import { gstRegistered, monthRange, thisMonthKey } from "@/lib/stepup-tax";

/** One month's statement for a studio, ready to show, print or download. */
export async function loadStatement(hostId: string, studioId: string, tz: string, monthKey: string | undefined) {
  const now = new Date();
  const current = thisMonthKey(now, tz);
  const key = monthKey && parseMonthKey(monthKey) && monthKey <= current ? monthKey : current;
  const { year, month } = parseMonthKey(key)!;
  const { from, to } = monthRange(year, month, tz);
  const gst = gstRegistered();
  const lines = statementLines(await statementEntries(hostId, from, to), gst);
  const prevKey = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  const nextKey = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  return {
    key,
    label: monthLabel(year, month),
    lines,
    totals: statementTotals(lines),
    gstRegistered: gst,
    prevKey,
    nextKey: nextKey <= current ? nextKey : null,
    invoiceNo: `SU-${key.replace("-", "")}-${studioId.slice(-6).toUpperCase()}`,
  };
}
