import Link from "next/link";
import type { ReactNode } from "react";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { dateBlockParts, formatInTimeZoneShort } from "@/lib/studio-format";
import { listingLabel } from "@/lib/listing";
import { money } from "@/lib/statement";
import type { DashClass } from "@/lib/studio-data";
import { HostEqualizer } from "@/components/host/HostEqualizer";
import { OpenPanelButton, StudioBanner, StudioPanelProvider, type Panel } from "./StudioPanels";
import { CreateClassV2 } from "./CreateClassV2";
import { ClassSheet, type SheetProps } from "./ClassSheet";
import { startPayoutOnboardingAction } from "@/lib/actions/payout-actions";

type CreateProps = React.ComponentProps<typeof CreateClassV2>;

export type StudioHomeProps = {
  name: string;
  address: string;
  timezone: string;
  upcoming: DashClass[];
  past: DashClass[];
  hosted: number;
  checkIns: number;
  newStudents: { count: number; cents: number };
  payouts: { on: boolean; canSetUp: boolean; holderName: string; nextLabel: string; nextCents: number };
  students: { total: number; once: number; returned: number; faces: string[] };
  openId: string | null;
  sheet: SheetProps | null;
  sheetVenues: { id: string; name: string; address: string }[];
  smsOn: boolean;
  smsNumber: string | null;
  create: Omit<CreateProps, "prefill"> & { prefill: CreateProps["prefill"] };
  initialPanel: Panel | null;
};

const SEGMENTS = 8;
const FACE_HUES = [85, 45, 25, 60, 345];

function priceLabel(k: DashClass) {
  if (k.listing === "TRIAL") return "Free trial";
  if (k.listing === "COURSE") return k.coursePriceCents ? `${money(k.coursePriceCents).replace(/\.00$/, "")} course` : "Course";
  if (k.listing === "HIDDEN") return "Off StepUp";
  return k.priceCents > 0 ? money(k.priceCents).replace(/\.00$/, "") : "Free";
}

const chip = (bg: string, ink: string) => ({ background: bg, color: ink });
const LISTING_CHIP: Record<string, { background: string; color: string }> = {
  DROP_IN: chip("oklch(94% 0.05 85)", "oklch(38% 0.09 70)"),
  TRIAL: chip("oklch(93% 0.06 150)", "oklch(32% 0.08 150)"),
  COURSE: chip("oklch(93% 0.03 250)", "oklch(35% 0.07 250)"),
  HIDDEN: chip("oklch(93% 0.01 70)", "oklch(40% 0.02 60)"),
};

function Row({ k, past, open }: { k: DashClass; past: boolean; open: boolean }) {
  const d = dateBlockParts(k.startTime, k.timezone);
  const when = `${formatInTimeZoneShort(k.startTime, k.timezone)}${k.repeat && !past ? ` · ${k.repeat.toLowerCase()}` : ""}`;
  const pct = k.stepupSpots ? Math.min(100, Math.round((k.booked / k.stepupSpots) * 100)) : 0;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "12px 18px",
        padding: "18px 22px",
        borderTop: "1px solid oklch(93% 0.008 70)",
        background: open ? "oklch(97% 0.02 60)" : undefined,
      }}
    >
      <div style={{ flex: "none", width: 52, textAlign: "center" }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.08em", color: C.brand }}>{d.month}</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 24, lineHeight: 1 }}>{d.day}</div>
      </div>
      <div style={{ flex: "1 1 240px", minWidth: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <h3 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 17, margin: 0 }}>{k.title}</h3>
          {!past && (
            <span className="sd-chip" style={LISTING_CHIP[k.listing] ?? LISTING_CHIP.DROP_IN}>
              {listingLabel(k.listing)}
            </span>
          )}
          <span className="sd-chip" style={chip("oklch(95% 0.012 70)", "oklch(35% 0.02 60)")}>
            {k.style}
          </span>
          {k.kids && (
            <span className="sd-chip" style={chip("oklch(93% 0.05 330)", "oklch(38% 0.1 330)")}>
              Kids
            </span>
          )}
        </div>
        <div className="sd-hint" style={{ marginTop: 3 }}>
          {when} · {past ? `${k.durationMin} min` : k.venueName} · with {k.teacherName}
          {!past && k.laterSessions > 0 ? ` · ${k.laterSessions} more ${k.listing === "COURSE" ? "weeks" : "dates"} booked in` : ""}
        </div>
        {k.roleSummary && <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3, color: "oklch(35% 0.05 250)" }}>{k.roleSummary}</div>}
      </div>
      <div style={{ flex: "none", width: 96, textAlign: "right", fontFamily: DISPLAY, fontWeight: 700, fontSize: 15 }}>{priceLabel(k)}</div>
      <div style={{ flex: "none", width: 132 }}>
        <div aria-hidden style={{ height: 6, borderRadius: 999, background: "oklch(93% 0.01 70)", overflow: "hidden", marginBottom: 5 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: C.brand }} />
        </div>
        <div style={{ fontSize: 13 }}>
          <strong>{k.booked}</strong>/{k.stepupSpots} StepUp spots
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flex: "none" }}>
        <Link
          href={open ? "/studio" : `/studio?class=${k.id}#class-sheet`}
          scroll={false}
          aria-expanded={open}
          aria-controls="class-sheet"
          className="sd-btn-ghost"
        >
          {past ? "Class list" : open ? "Close" : "Open"}
        </Link>
        {past && (
          <Link href={`/studio?create=1&from=${k.id}#create-class`} className="sd-btn-ghost">
            Run again
          </Link>
        )}
      </div>
    </div>
  );
}

function Stat({ kicker, value, unit, children }: { kicker: string; value: ReactNode; unit: string; children: ReactNode }) {
  return (
    <div className="sd-card" style={{ padding: "22px 24px" }}>
      <div className="sd-kicker" style={{ color: "oklch(46% 0.02 60)" }}>
        {kicker}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 10 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 40, lineHeight: 1 }}>{value}</div>
        <div className="sd-hint" style={{ fontSize: 14 }}>
          {unit}
        </div>
      </div>
      {children}
    </div>
  );
}

/**
 * The Studio tab: header, the in-page Create a class form, the numbers that
 * matter, payouts, upcoming classes (each opening its class sheet in the
 * page), past classes and one thing to try.
 */
export function StudioHome(p: StudioHomeProps) {
  const next = p.upcoming[0];
  const openUpcoming = p.sheet && !p.sheet.past;
  const openPast = p.sheet && p.sheet.past;
  const sheet = p.sheet ? <ClassSheet s={p.sheet} venues={p.sheetVenues} smsOn={p.smsOn} smsNumber={p.smsNumber} /> : null;

  return (
    <StudioPanelProvider initial={p.initialPanel}>
      <section
        style={{
          background: C.ink,
          color: C.onDark,
          borderRadius: 28,
          padding: "clamp(28px, 4vw, 40px) clamp(24px, 4vw, 44px)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 28,
          overflow: "hidden",
          position: "relative",
          marginBottom: 20,
        }}
      >
        <HostEqualizer variant="hero" />
        <div style={{ position: "relative" }}>
          <div
            style={{
              display: "inline-block",
              padding: "5px 13px",
              borderRadius: 999,
              background: C.darkChip,
              color: C.darkChipInk,
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.06em",
              marginBottom: 16,
            }}
          >
            YOUR STUDIO
          </div>
          <h1 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: "clamp(34px, 5vw, 44px)", lineHeight: 1.05, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
            {p.name}
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 16px", fontSize: 15, color: C.onDarkBody }}>
            <span>{p.address}</span>
            <span aria-hidden style={{ width: 4, height: 4, borderRadius: 999, background: "oklch(55% 0.02 60)" }} />
            <span>Class times in {p.timezone}</span>
          </div>
        </div>
        <div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: 12 }}>
          <OpenPanelButton
            panel="class"
            style={{ flex: "none", whiteSpace: "nowrap", border: 0, fontWeight: 700, fontSize: 15, padding: "14px 24px", borderRadius: 999, background: C.brand, color: C.onBrand }}
          >
            Create a class
          </OpenPanelButton>
          <Link href="/studio/team?invite=1#invite-teachers" className="su-btn" style={HEADER_OUTLINE}>
            Invite teachers
          </Link>
          <Link href="/studio/profile" className="su-btn" style={HEADER_OUTLINE}>
            Edit studio
          </Link>
        </div>
      </section>

      <StudioBanner />
      <CreateClassV2 {...p.create} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 16, marginBottom: 16 }}>
        <Stat kicker="Upcoming" value={p.upcoming.length} unit={p.upcoming.length === 1 ? "class on the calendar" : "classes on the calendar"}>
          <div style={{ marginTop: 16, fontSize: 13.5, color: "oklch(50% 0.14 45)", fontWeight: 600 }}>
            {next ? `Next: ${next.title}, ${formatInTimeZoneShort(next.startTime, next.timezone)}` : "Nothing scheduled yet"}
          </div>
        </Stat>
        <Stat kicker="Classes hosted" value={p.hosted} unit="all time">
          <div style={{ display: "flex", gap: 5, marginTop: 18 }} aria-hidden>
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <div key={i} style={{ flex: 1, height: 6, borderRadius: 999, background: i < p.hosted ? C.brand : "oklch(93% 0.01 70)" }} />
            ))}
          </div>
        </Stat>
        <Stat kicker="Check-ins" value={p.checkIns} unit={p.checkIns === 1 ? "dancer showed up" : "dancers showed up"}>
          <div className="sd-hint" style={{ marginTop: 16 }}>
            Marked on the class list
          </div>
        </Stat>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          padding: "18px 24px",
          borderRadius: 22,
          background: "oklch(94% 0.05 85)",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "6px 14px" }}>
          <span className="sd-kicker" style={{ color: "oklch(38% 0.09 70)" }}>
            This term
          </span>
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 17 }}>
            {p.newStudents.count === 0
              ? "No new students through StepUp yet this term."
              : `StepUp brought you ${p.newStudents.count} new ${p.newStudents.count === 1 ? "student" : "students"} worth ${money(p.newStudents.cents)}.`}
          </span>
        </div>
        <Link href="/studio/dancers" className="sd-btn">
          See your dancers
        </Link>
      </div>

      {!p.payouts.on && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
            padding: "22px 26px",
            borderRadius: 24,
            background: "oklch(96% 0.04 85)",
            border: "1px solid oklch(88% 0.06 85)",
            marginBottom: 32,
          }}
        >
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flex: "1 1 360px" }}>
            <div aria-hidden style={{ flex: "none", width: 44, height: 44, borderRadius: 14, background: "oklch(90% 0.08 85)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="2.5" y="6" width="19" height="13" rx="3" stroke="oklch(45% 0.12 60)" strokeWidth="1.6" />
                <path d="M2.5 10.5h19" stroke="oklch(45% 0.12 60)" strokeWidth="1.6" />
                <path d="M6.5 15h4" stroke="oklch(45% 0.12 60)" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                <h2 className="sd-h3">Get paid for your classes</h2>
                <span className="sd-chip" style={chip("oklch(90% 0.08 85)", "oklch(38% 0.09 70)")}>
                  NOT SET UP
                </span>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 14.5, color: "oklch(35% 0.02 60)" }}>
                Connect a payout account through Stripe to charge for classes. Stripe collects your ABN, ID and bank details on its own secure
                page, so StepUp never sees them. Free trial classes work without it.
              </p>
            </div>
          </div>
          {p.payouts.canSetUp ? (
            <form action={startPayoutOnboardingAction}>
              <button type="submit" className="sd-btn" style={{ background: C.brand }}>
                Set up payouts
              </button>
            </form>
          ) : (
            <span className="sd-hint">{p.payouts.holderName} sets up payouts for the studio.</span>
          )}
        </div>
      )}
      {p.payouts.on && (
        <div className="sd-card" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "16px 22px", marginBottom: 32 }}>
          <div>
            <span className="sd-chip" style={chip("oklch(93% 0.06 150)", "oklch(32% 0.08 150)")}>
              PAYOUTS ON
            </span>{" "}
            <span style={{ fontWeight: 600, marginLeft: 8 }}>{`Next payout ${p.payouts.nextLabel}: ${money(p.payouts.nextCents)}`}</span>
          </div>
          <Link href="/studio/payouts" className="sd-btn-ghost">
            Statements and payouts
          </Link>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 14 }}>
        <h2 className="sd-h2">Upcoming classes</h2>
        <span className="sd-hint">Open a class for its class list, to message students, move it or cancel it.</span>
      </div>
      {p.upcoming.length > 0 ? (
        <div className="sd-card" style={{ overflow: "hidden", marginBottom: openUpcoming ? 20 : 36 }}>
          {p.upcoming.map((k) => (
            <Row key={k.id} k={k} past={false} open={p.openId === k.id} />
          ))}
          <div style={{ padding: "16px 22px", borderTop: "1px solid oklch(93% 0.008 70)" }}>
            <OpenPanelButton panel="class" className="sd-btn-dash" style={{}}>
              + Create another class
            </OpenPanelButton>
          </div>
        </div>
      ) : (
        <div
          className="sd-card"
          style={{ padding: "40px 24px", textAlign: "center", marginBottom: 36, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}
        >
          <HostEqualizer variant="empty" />
          <h3 className="sd-h3">The floor is empty this week</h3>
          <p className="sd-hint" style={{ margin: 0, fontSize: 15 }}>
            Post a new class and it&apos;s bookable the moment it goes live.
          </p>
          <OpenPanelButton panel="class" style={{ border: 0, fontWeight: 700, fontSize: 15, padding: "13px 22px", borderRadius: 999, background: C.brand, color: C.onBrand }}>
            Create a class
          </OpenPanelButton>
        </div>
      )}
      {openUpcoming && sheet}

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 14 }}>
        <h2 className="sd-h2">Past classes</h2>
        <span className="sd-hint">{p.hosted} hosted</span>
      </div>
      {p.past.length > 0 ? (
        <div className="sd-card" style={{ overflow: "hidden", marginBottom: openPast ? 20 : 36 }}>
          {p.past.map((k) => (
            <Row key={k.id} k={k} past open={p.openId === k.id} />
          ))}
        </div>
      ) : (
        <div className="sd-card sd-hint" style={{ padding: "22px 24px", marginBottom: 36 }}>
          Classes you&apos;ve run show here, with their class lists.
        </div>
      )}
      {openPast && sheet}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 28,
          alignItems: "center",
          justifyContent: "space-between",
          padding: "clamp(24px, 4vw, 36px)",
          borderRadius: 28,
          background: "oklch(96.5% 0.014 75)",
          border: "1px solid oklch(90% 0.02 75)",
        }}
      >
        <div style={{ flex: "1 1 360px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "oklch(50% 0.16 35)" }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: C.brand }} />
            ONE THING TO TRY
          </div>
          <h3 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 26, letterSpacing: "-0.02em", margin: 0 }}>Turn first-timers into pass holders.</h3>
          <p style={{ margin: 0, fontSize: 15, color: "oklch(35% 0.02 60)" }}>
            {`${p.students.total} ${p.students.total === 1 ? "person has" : "people have"} booked you through StepUp, and their contact details are yours. Send your own pass offer after their first class. There's no commission on pass sales.`}
          </p>
          <div>
            <Link href="/studio/dancers#pass-title" className="sd-btn">
              Send a pass offer
            </Link>
          </div>
        </div>
        <div style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "Came once", value: p.students.once, tone: "oklch(86% 0.03 70)" },
            { label: "Came back for more", value: p.students.returned, tone: C.brand },
          ].map((r) => (
            <div key={r.label}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                <span>{r.label}</span>
                <span>{r.value}</span>
              </div>
              <div aria-hidden style={{ height: 10, borderRadius: 999, background: "oklch(92% 0.01 70)", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${p.students.total ? Math.round((r.value / p.students.total) * 100) : 0}%`,
                    height: "100%",
                    background: r.tone,
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>
          ))}
          {p.students.faces.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex" }}>
                {p.students.faces.map((f, i) => {
                  const hue = FACE_HUES[i % FACE_HUES.length];
                  return (
                    <div
                      key={i}
                      aria-hidden
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 999,
                        background: `oklch(89% 0.055 ${hue})`,
                        border: "2px solid oklch(96.5% 0.014 75)",
                        marginLeft: i ? -9 : 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color: `oklch(36% 0.09 ${hue})`,
                      }}
                    >
                      {f}
                    </div>
                  );
                })}
              </div>
              <span className="sd-hint">{p.students.total > p.students.faces.length ? "and more from past classes" : "from past classes"}</span>
            </div>
          )}
        </div>
      </div>
    </StudioPanelProvider>
  );
}

const HEADER_OUTLINE = {
  flex: "none",
  whiteSpace: "nowrap",
  fontWeight: 600,
  fontSize: 15,
  padding: "14px 24px",
  borderRadius: 999,
  border: "1.5px solid oklch(45% 0.02 60)",
  color: "oklch(92% 0.01 70)",
  textDecoration: "none",
} as const;
