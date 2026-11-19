import Link from "next/link";
import { DISPLAY } from "@/lib/marketing-theme";
import { POLICIES, type PolicyId } from "@/lib/policies";
import { roleCounts, neededSide, type RoleLimits } from "@/lib/partner-roles";
import { cutoffSentence, courseCutoffSentence } from "@/lib/policy-copy";
import { formatMoney } from "@/lib/time";
import { CourseInterestButton } from "./CourseInterestButton";

const CARD = {
  padding: "22px 24px",
  borderRadius: 22,
  background: "oklch(99.5% 0.004 70)",
  border: "1px solid oklch(88% 0.01 70)",
  display: "flex",
  flexDirection: "column",
  gap: 10,
} as const;

const KICKER = { fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "oklch(42% 0.15 38)" } as const;

function Bar({ label, n, of, color }: { label: string; n: number; of: number | null; color: string }) {
  const pct = of ? Math.min(100, Math.round((n / of) * 100)) : Math.min(100, n * 8);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "62px minmax(0,1fr) auto", gap: 8, alignItems: "center" }}>
      <span style={{ fontWeight: 700 }}>{label}</span>
      <span aria-hidden="true" style={{ height: 8, borderRadius: 99, background: "oklch(92% 0.01 70)", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: `${pct}%`, background: color, borderRadius: 99 }} />
      </span>
      <span style={{ fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{of ? `${n}/${of}` : n}</span>
    </div>
  );
}

/** "Leads and follows" for this night, and which side is needed. */
export function RolesCard({ limits, roles, dateLabel }: { limits: RoleLimits; roles: (string | null)[]; dateLabel: string }) {
  const { leads, follows } = roleCounts(roles);
  const need = neededSide(roles);
  const nudge =
    need === "LEAD" ? "Leads needed, so leads get partnered straight away." : need === "FOLLOW" ? "Follows needed, so follows get partnered straight away." : "Nicely balanced.";
  const caps = limits.rule === "CAPS";
  return (
    <div style={CARD}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={KICKER}>LEADS AND FOLLOWS · {dateLabel.toUpperCase()}</div>
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            padding: "4px 11px",
            borderRadius: 999,
            background: need ? "oklch(94% 0.06 85)" : "oklch(93% 0.06 150)",
            color: need ? "oklch(40% 0.1 70)" : "oklch(32% 0.08 150)",
          }}
        >
          {need === "LEAD" ? "Leads needed" : need === "FOLLOW" ? "Follows needed" : "Leads and follows balanced"}
        </span>
      </div>
      <Bar label="Leads" n={leads} of={caps ? (limits.leadCap ?? null) : null} color="oklch(55% 0.1 250)" />
      <Bar label="Follows" n={follows} of={caps ? (limits.followCap ?? null) : null} color="oklch(55% 0.12 330)" />
      <div style={{ fontSize: 14, color: "oklch(40% 0.02 60)" }}>
        {limits.rule === "NONE" ? "Partner work, no role limits." : nudge} You don&apos;t need to bring a partner. Pick Lead, Follow or Either when you book.
      </div>
    </div>
  );
}

/** The studio's cancellation preset for this class, with the exact cut-off. */
export function PolicyCard({
  policy,
  start,
  tz,
  hostName,
  course,
}: {
  policy: PolicyId;
  start: Date;
  tz: string;
  hostName: string;
  course: boolean;
}) {
  return (
    <div style={CARD}>
      <div style={KICKER}>CANCELLATION · {POLICIES[policy].label.toUpperCase()}</div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18 }}>
        {course ? courseCutoffSentence(start, tz, policy) : cutoffSentence(start, tz, policy)}
      </div>
      <div style={{ fontSize: 14, color: "oklch(42% 0.02 60)" }}>
        {`Set by ${hostName}. If the class moves venue after you book, you can cancel free whatever the time.`}
      </div>
    </div>
  );
}

/** "Also at {studio} · course enrolment". */
export function CourseCard({
  studioId,
  studioName,
  course,
  signedIn,
}: {
  studioId: string;
  studioName: string;
  course: {
    id: string;
    title: string;
    style: string;
    weeks: number;
    priceCents: number;
    currency: string;
    started: boolean;
    startsLabel: string;
    nextTermLabel: string | null;
  };
  signedIn: boolean;
}) {
  return (
    <div style={{ ...CARD, background: "oklch(97% 0.02 75)" }}>
      <div style={KICKER}>ALSO AT {studioName.toUpperCase()} · COURSE ENROLMENT</div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 19 }}>
        {`${course.title} · ${course.weeks} weeks · ${formatMoney(course.priceCents, course.currency).replace(/\.00$/, "")}`}
      </div>
      <div style={{ fontSize: 15, color: "oklch(38% 0.02 60)" }}>
        {course.started
          ? `This term has already started. ${course.nextTermLabel ? `Next term starts ${course.nextTermLabel}. ` : ""}Book the whole course in one go when enrolments open.`
          : `Enrolments are open. It starts ${course.startsLabel}. Book the whole course in one go.`}
      </div>
      <div>
        {course.started ? (
          <CourseInterestButton studioId={studioId} style={course.style} signedIn={signedIn} />
        ) : (
          <Link
            href={`/first-class/${course.id}`}
            style={{
              display: "inline-block",
              fontWeight: 700,
              fontSize: 15,
              padding: "12px 20px",
              borderRadius: 999,
              border: "1.5px solid oklch(22% 0.02 60)",
              color: "oklch(22% 0.02 60)",
              textDecoration: "none",
            }}
          >
            See the course
          </Link>
        )}
      </div>
    </div>
  );
}
