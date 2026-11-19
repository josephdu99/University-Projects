/** Studio terms as students read them. Pure, so checkout and the dashboard can both show it. */
import { POLICIES, type PolicyId } from "@/lib/policies";

/** The template's sections, in the words students read at checkout. */
export function templateSections(
  terms: { waiver: boolean; conduct: boolean; cancellation: boolean },
  policy: PolicyId,
): { title: string; body: string }[] {
  const p = POLICIES[policy];
  return [
    terms.waiver && {
      title: "Waiver",
      body: "Dance is physical activity. Take part at your own pace and tell your teacher if you need to sit out.",
    },
    terms.conduct && {
      title: "Code of conduct",
      body: "Ask before any partner work beyond the basic hold. Anyone can say no to a partner, any time.",
    },
    terms.cancellation && {
      title: `Cancellation (${p.label})`,
      body: `Free until ${p.until} class. After that, ${p.after}.`,
    },
  ].filter(Boolean) as { title: string; body: string }[];
}

/** "waiver, code of conduct and cancellation policy" */
export function termsListLabel(t: { mode: string; waiver: boolean; conduct: boolean; cancellation: boolean }): string {
  if (t.mode === "UPLOAD") return "terms";
  const parts = [t.waiver && "waiver", t.conduct && "code of conduct", t.cancellation && "cancellation policy"].filter(
    Boolean,
  ) as string[];
  if (parts.length === 0) return "terms";
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}
