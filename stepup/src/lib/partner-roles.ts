/**
 * Lead and follow balancing for partner classes.
 *
 * A teacher turns on "Partner class" and picks a rule: separate caps for
 * leads and follows, balance within X (no more than X extra on either side),
 * or no role limits. Students pick Lead, Follow or Either; "Either" fills
 * whichever side is short. Each role has its own waitlist, and a spot that
 * opens on one side goes to the first person waiting who now fits.
 *
 * Pure and client-safe: the booking engine decides with these, and the class
 * page and class list draw the same counts.
 */

export type PartnerRule = "CAPS" | "BALANCE" | "NONE";
export type DanceRole = "LEAD" | "FOLLOW" | "EITHER";

export const PARTNER_RULES: { id: PartnerRule; label: string; how: string }[] = [
  { id: "CAPS", label: "Separate caps", how: "e.g. 10 leads and 10 follows" },
  { id: "BALANCE", label: "Balance within X", how: "No more than X extra on either side" },
  { id: "NONE", label: "No roles", how: "Partner work, but no role limits" },
];

export const ROLE_LABEL: Record<DanceRole, string> = {
  LEAD: "Lead",
  FOLLOW: "Follow",
  EITHER: "Either",
};

export function isPartnerRule(v: unknown): v is PartnerRule {
  return v === "CAPS" || v === "BALANCE" || v === "NONE";
}

export function isDanceRole(v: unknown): v is DanceRole {
  return v === "LEAD" || v === "FOLLOW" || v === "EITHER";
}

/** Partner classes with role limits ask for a role at booking. */
export function needsRole(rule: string | null | undefined): boolean {
  return rule === "CAPS" || rule === "BALANCE" || rule === "NONE";
}

export type RoleLimits = {
  rule: PartnerRule;
  leadCap?: number | null;
  followCap?: number | null;
  balanceX?: number | null;
};

type Tally = { leads: number; follows: number; either: number };

export function tally(roles: (string | null | undefined)[]): Tally {
  const t = { leads: 0, follows: 0, either: 0 };
  for (const r of roles) {
    if (r === "LEAD") t.leads++;
    else if (r === "FOLLOW") t.follows++;
    else if (r === "EITHER") t.either++;
  }
  return t;
}

/**
 * Leads and follows as the room will actually pair up: each "Either" joins
 * whichever side is shorter at that moment.
 */
export function roleCounts(roles: (string | null | undefined)[]): { leads: number; follows: number } {
  let { leads, follows, either } = tally(roles);
  for (; either > 0; either--) {
    if (leads <= follows) leads++;
    else follows++;
  }
  return { leads, follows };
}

/** The smallest imbalance the "Either"s can bring the room to. */
function minImbalance(t: Tally): number {
  const diff = Math.abs(t.leads - t.follows);
  return diff >= t.either ? diff - t.either : (t.either - diff) % 2;
}

/**
 * Would the class still be within its rule with one more person in this
 * role? (Overall capacity is checked separately.)
 */
export function fitsRole(
  limits: RoleLimits,
  roles: (string | null | undefined)[],
  role: DanceRole,
): boolean {
  if (limits.rule === "NONE") return true;
  const t = tally([...roles, role]);
  if (limits.rule === "CAPS") {
    const leadCap = limits.leadCap ?? Infinity;
    const followCap = limits.followCap ?? Infinity;
    if (t.leads > leadCap || t.follows > followCap) return false;
    return t.either <= leadCap - t.leads + (followCap - t.follows);
  }
  return minImbalance(t) <= Math.max(0, limits.balanceX ?? 0);
}

/** Which side the class is short of right now, if either. */
export function neededSide(roles: (string | null | undefined)[]): "LEAD" | "FOLLOW" | null {
  const { leads, follows } = roleCounts(roles);
  if (leads < follows) return "LEAD";
  if (follows < leads) return "FOLLOW";
  return null;
}

export function neededChip(roles: (string | null | undefined)[]): string {
  const need = neededSide(roles);
  return need === "LEAD" ? "Leads needed" : need === "FOLLOW" ? "Follows needed" : "Leads and follows balanced";
}

/** "Leads 5/6 · Follows 6/6 · Leads needed", as the studio's lists show it. */
export function roleSummary(limits: RoleLimits | null, roles: (string | null | undefined)[]): string {
  if (!limits) return "";
  if (limits.rule === "NONE") return "Partner class, no role limits";
  const { leads, follows } = roleCounts(roles);
  const need = leads < follows ? " · Leads needed" : follows < leads ? " · Follows needed" : " · Balanced";
  if (limits.rule === "CAPS") {
    return `Leads ${leads}/${limits.leadCap ?? "–"} · Follows ${follows}/${limits.followCap ?? "–"}${need}`;
  }
  return `Leads ${leads} · Follows ${follows} · within ${limits.balanceX ?? 0}${need}`;
}

/**
 * Who comes off the waitlist next: the first person, in queue order, whose
 * role now fits. A follow waiting behind a lead who still doesn't fit gets
 * the spot; that is the point of a waitlist per role.
 */
export function nextFromWaitlist<T extends { role: string | null }>(
  limits: RoleLimits | null,
  holding: (string | null | undefined)[],
  waiting: T[],
): T | null {
  if (!limits) return waiting[0] ?? null;
  for (const w of waiting) {
    const role = isDanceRole(w.role) ? w.role : "EITHER";
    if (fitsRole(limits, holding, role)) return w;
  }
  return null;
}

/** A class's role limits, or null when it isn't a partner class. */
export function roleLimitsOf(c: {
  partnerRule: string | null;
  leadCap: number | null;
  followCap: number | null;
  balanceX: number | null;
}): RoleLimits | null {
  if (!isPartnerRule(c.partnerRule)) return null;
  return { rule: c.partnerRule, leadCap: c.leadCap, followCap: c.followCap, balanceX: c.balanceX };
}
