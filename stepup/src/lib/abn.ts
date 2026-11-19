/**
 * Australian Business Number checks.
 *
 * This is the Australian Business Register's published checksum: take the 11
 * digits, subtract 1 from the first, weight them 10, 1, 3, 5, … 19, and the
 * total must divide by 89. It catches typos and invented numbers, but it
 * cannot tell whether a business is registered or active. That needs the ABN
 * Lookup web service, which asks for a registered GUID; until one is set up,
 * the sign-up form says it checks the format and nothing more.
 */

const WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

export function abnDigits(value: string): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function isValidAbn(value: string): boolean {
  const d = abnDigits(value);
  if (d.length !== 11) return false;
  const total = d
    .split("")
    .reduce((sum, ch, i) => sum + (Number(ch) - (i === 0 ? 1 : 0)) * WEIGHTS[i], 0);
  return total % 89 === 0;
}

/** "51824753556" → "51 824 753 556", the way the ABR prints them. */
export function formatAbn(value: string): string {
  const d = abnDigits(value);
  if (d.length !== 11) return value;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
}
