"use client";

import { useState, useTransition } from "react";
import { setMemberRoleAction, verifyWwccAction, type Result } from "@/lib/actions/studio-admin-actions";
import { OpenPanelButton } from "../StudioPanels";
import { ResultLine } from "./TabTitle";

export type RosterMember = {
  id: string;
  name: string;
  initials: string;
  meta: string;
  isOwner: boolean;
  isYou: boolean;
  role: "OWNER" | "MANAGER" | "TEACHER";
  teaches: boolean;
  status: "You" | "Joined" | "Invite sent" | "Invite expired";
  wwcc: { verified: boolean; meta: string; expiringSoon: boolean; expired: boolean };
};

const BADGE: Record<RosterMember["status"], { background: string; color: string }> = {
  You: { background: "oklch(22% 0.02 60)", color: "#fff" },
  Joined: { background: "oklch(93% 0.06 150)", color: "oklch(32% 0.08 150)" },
  "Invite sent": { background: "oklch(94% 0.045 65)", color: "oklch(42% 0.15 38)" },
  "Invite expired": { background: "oklch(93% 0.01 70)", color: "oklch(40% 0.02 60)" },
};

function WwccForm({ m }: { m: RosterMember }) {
  const [open, setOpen] = useState(false);
  const [r, setR] = useState<Result>(undefined);
  const [pending, start] = useTransition();
  if (!open) {
    return (
      <button type="button" className="sd-btn-ghost" style={{ padding: "7px 14px", fontSize: 13.5 }} onClick={() => setOpen(true)}>
        {m.wwcc.verified ? "Update check" : "Add Working With Children Check"}
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await verifyWwccAction(m.id, fd);
          setR(res);
          if (res?.ok) setOpen(false);
        });
      }}
      style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", padding: "12px 14px", borderRadius: 14, background: "oklch(96% 0.01 70)" }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <input
          className="su-fld"
          name="number"
          aria-label={`Working With Children Check number for ${m.name}`}
          placeholder="WWC1234567E"
          autoCapitalize="characters"
          style={{ flex: "1 1 160px", height: 46 }}
          required
        />
        <label style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 200px" }}>
          <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>Expires</span>
          <input className="su-fld" type="date" name="expiry" style={{ height: 46 }} required />
        </label>
      </div>
      <label className="sd-check" style={{ fontSize: 13.5 }}>
        <input type="checkbox" name="checked" />
        <span>
          I checked this number, name and expiry on the{" "}
          <a href="https://ocg.nsw.gov.au/working-children-check" target="_blank" rel="noopener noreferrer">
            Office of the Children&apos;s Guardian site
          </a>
          .
        </span>
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="sd-btn" disabled={pending} style={{ padding: "10px 18px", fontSize: 14 }}>
          {pending ? "Saving…" : "Verify"}
        </button>
        <button type="button" className="sd-btn-ghost" style={{ padding: "8px 14px", fontSize: 13.5 }} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <ResultLine r={r} />
    </form>
  );
}

function RoleSelect({ m }: { m: RosterMember }) {
  const [r, setR] = useState<Result>(undefined);
  const [pending, start] = useTransition();
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <select
        className="su-fld"
        aria-label={`Role for ${m.name}`}
        defaultValue={m.role}
        disabled={pending}
        style={{ height: 40, width: 140, fontSize: 14 }}
        onChange={(e) => {
          const role = e.target.value;
          start(async () => setR(await setMemberRoleAction(m.id, role)));
        }}
      >
        <option value="MANAGER">Manager</option>
        <option value="TEACHER">Teacher</option>
      </select>
      {r && !r.ok && <ResultLine r={r} />}
    </span>
  );
}

/** "Your teachers" on the Team tab: roles, Working With Children Checks and invites. */
export function TeamRoster({ rows, canChangeRoles }: { rows: RosterMember[]; canChangeRoles: boolean }) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {rows.map((m, i) => (
        <li
          key={m.id}
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "10px 16px",
            padding: "16px clamp(16px, 2.5vw, 26px)",
            borderTop: i ? "1px solid oklch(93% 0.008 70)" : undefined,
          }}
        >
          <div
            aria-hidden
            style={{
              flex: "none",
              width: 42,
              height: 42,
              borderRadius: 999,
              background: m.isYou ? "oklch(66% 0.19 35)" : "oklch(89% 0.055 45)",
              color: m.isYou ? "#fff" : "oklch(38% 0.09 40)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display), sans-serif",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {m.initials}
          </div>
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15.5 }}>{m.name}</div>
            <div className="sd-hint" style={{ overflowWrap: "anywhere" }}>
              {m.meta}
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            {m.isOwner || !canChangeRoles ? (
              <span className="sd-chip" style={{ background: "oklch(95% 0.012 70)", color: "oklch(30% 0.02 60)" }}>
                {m.role === "OWNER" ? "Owner" : m.role === "MANAGER" ? "Manager" : "Teacher"}
              </span>
            ) : (
              <RoleSelect m={m} />
            )}
            {m.teaches && m.wwcc.verified && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span
                  className="sd-chip"
                  style={
                    m.wwcc.expired
                      ? { background: "oklch(93% 0.05 30)", color: "oklch(42% 0.15 30)" }
                      : m.wwcc.expiringSoon
                        ? { background: "oklch(94% 0.06 85)", color: "oklch(40% 0.1 70)" }
                        : { background: "oklch(93% 0.06 150)", color: "oklch(32% 0.08 150)" }
                  }
                >
                  {m.wwcc.expired ? "WWCC expired" : "WWCC verified"}
                </span>
                <span className="sd-hint">{m.wwcc.meta}</span>
              </span>
            )}
            <span className="sd-chip" style={BADGE[m.status]}>
              {m.status}
            </span>
          </div>
          {m.teaches && (!m.wwcc.verified || m.wwcc.expiringSoon || m.wwcc.expired) && (
            <div style={{ flexBasis: "100%", display: "flex", paddingLeft: 58 }}>
              <WwccForm m={m} />
            </div>
          )}
        </li>
      ))}
      <li style={{ padding: "16px clamp(16px, 2.5vw, 26px)", borderTop: "1px solid oklch(93% 0.008 70)" }}>
        <OpenPanelButton panel="invite" className="sd-btn-dash" style={{}} hideWhenOpen>
          + Invite teachers
        </OpenPanelButton>
      </li>
    </ul>
  );
}
