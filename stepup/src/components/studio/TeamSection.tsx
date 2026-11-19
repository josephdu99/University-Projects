import { C, DISPLAY } from "@/lib/marketing-theme";
import { OpenPanelButton } from "./StudioPanels";
import { InvitePanel } from "./InvitePanel";

export type TeamRow = {
  id: string;
  name: string;
  initials: string;
  meta: string;
  status: "You" | "Invite sent" | "Invite expired" | "Joined";
};

const BADGE: Record<TeamRow["status"], { bg: string; fg: string }> = {
  You: { bg: "oklch(22% 0.02 60)", fg: "#fff" },
  Joined: { bg: "oklch(93% 0.06 150)", fg: "oklch(32% 0.08 150)" },
  "Invite sent": { bg: "oklch(94% 0.045 65)", fg: "oklch(42% 0.15 38)" },
  "Invite expired": { bg: "oklch(93% 0.01 70)", fg: "oklch(40% 0.02 60)" },
};

/**
 * "Your teachers": everyone on the studio's team, with where their invite
 * stands, and the in-page invite form at the foot of the list.
 */
export function TeamSection({
  rows,
  studioName,
  inviterName,
  ownerTeaches,
  origin,
}: {
  rows: TeamRow[];
  studioName: string;
  inviterName: string;
  ownerTeaches: boolean;
  origin: string;
}) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <h2 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: "clamp(22px, 3vw, 26px)", letterSpacing: "-0.02em", margin: 0 }}>
          Your teachers
        </h2>
        <span style={{ fontSize: 14, color: C.label }}>
          {rows.length} {rows.length === 1 ? "person" : "people"}
        </span>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, overflow: "hidden", marginBottom: 44 }}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {rows.map((r, i) => (
            <li
              key={r.id}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 16,
                padding: "16px clamp(16px, 2.5vw, 26px)",
                borderTop: i ? `1px solid ${C.rowDivider}` : undefined,
              }}
            >
              <div
                aria-hidden
                style={{
                  flex: "none",
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  background: r.status === "You" ? C.brand : "oklch(89% 0.055 45)",
                  color: r.status === "You" ? "#fff" : "oklch(38% 0.09 40)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {r.initials}
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16 }}>{r.name}</div>
                <div style={{ fontSize: 13.5, color: "oklch(50% 0.02 60)", overflowWrap: "anywhere" }}>{r.meta}</div>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "5px 11px",
                  borderRadius: 999,
                  background: BADGE[r.status].bg,
                  color: BADGE[r.status].fg,
                  whiteSpace: "nowrap",
                }}
              >
                {r.status}
              </span>
            </li>
          ))}
        </ul>
        <div style={{ padding: "18px clamp(16px, 2.5vw, 26px)", borderTop: `1px solid ${C.rowDivider}` }}>
          <OpenPanelButton
            panel="invite"
            hideWhenOpen
            style={{ fontWeight: 700, fontSize: 15, padding: "12px 20px", borderRadius: 999, border: "1.5px dashed oklch(22% 0.02 60)", background: "transparent", color: C.ink }}
          >
            + Invite teachers
          </OpenPanelButton>
        </div>
        <InvitePanel studioName={studioName} inviterName={inviterName} ownerTeaches={ownerTeaches} origin={origin} />
      </div>
    </>
  );
}
