"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addWalkInAction,
  cancelClassFromSheetAction,
  markAttendanceAction,
  messageClassAction,
  moveClassAction,
  removeWalkInAction,
  type ListLink,
  type Result,
} from "@/lib/actions/studio-admin-actions";
import { ROLE_LABEL, type DanceRole } from "@/lib/partner-roles";
import { CloseButton } from "./CreateClassV2";
import { PrintButton } from "./PrintButton";
import { useStudioPanels } from "./StudioPanels";

export type SheetRosterRow = {
  bookingId: string;
  name: string;
  first: boolean;
  role: string | null;
  note: string | null;
  status: "BOOKED" | "ATTENDED" | "NO_SHOW" | "PENDING_PAYMENT";
};

export type SheetProps = {
  id: string;
  title: string;
  whenLabel: string;
  venueId: string | null;
  venueName: string;
  teacherName: string;
  partner: boolean;
  roleSummary: string;
  ruleLabel: string;
  roster: SheetRosterRow[];
  walkIns: { id: string; name: string; role: string | null }[];
  waitLeads: string[];
  waitFollows: string[];
  waitOthers: string[];
  messages: { id: string; body: string; meta: string }[];
  recovery: string[];
  textKey: string;
  past: boolean;
  /** Attendance opens an hour before class. */
  canMark: boolean;
  hasSeries: boolean;
  canManage: boolean;
};

const MSG_TEMPLATES: [string, string][] = [
  ["Bring heels", "Reminder: bring heels for tonight’s class."],
  ["We’re in Studio B", "Heads up: we’re in Studio B tonight."],
  ["Running 10 min late", "Running about 10 minutes late. See you soon!"],
];

const CANCEL_REASONS = ["Teacher unwell", "Venue unavailable", "Not enough bookings", "Public holiday"];

type Tab = "list" | "msg" | "move" | "cancel";

function people(n: number) {
  return `${n} ${n === 1 ? "student" : "students"}`;
}

/**
 * One class, opened from the dashboard: its class list (one tap attended or
 * no-show, walk-ins, export and print), a message to everyone booked, moving
 * it, and cancelling it with "same studio first". A past class only has its
 * list and messages.
 */
export function ClassSheet({
  s,
  venues,
  smsOn,
  smsNumber,
  link = null,
  closeHref = "/studio",
}: {
  s: SheetProps;
  venues: { id: string; name: string; address: string }[];
  smsOn: boolean;
  smsNumber: string | null;
  /** A teacher on their emailed link, without signing in. */
  link?: ListLink;
  /** Where × goes; none on a page of its own. */
  closeHref?: string | null;
}) {
  const router = useRouter();
  const { setToast } = useStudioPanels();
  const [tab, setTab] = useState<Tab>("list");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [walkName, setWalkName] = useState("");
  const [walkRole, setWalkRole] = useState<DanceRole>("EITHER");
  const [msg, setMsg] = useState("");
  const [moveVenue, setMoveVenue] = useState<string>("");
  const [moveScope, setMoveScope] = useState<"one" | "future">("one");
  const [reason, setReason] = useState(CANCEL_REASONS[0]);

  const tabs: { id: Tab; label: string }[] = s.past
    ? [
        { id: "list", label: "Class list" },
        { id: "msg", label: "Message" },
      ]
    : [
        { id: "list", label: "Class list" },
        { id: "msg", label: "Message" },
        ...(s.canManage
          ? ([
              { id: "move", label: "Move" },
              { id: "cancel", label: "Cancel" },
            ] as { id: Tab; label: string }[])
          : []),
      ];

  const booked = s.roster.filter((r) => r.status !== "PENDING_PAYMENT").length;
  const firsts = s.roster.filter((r) => r.first).length;
  const attended = s.roster.filter((r) => r.status === "ATTENDED").length + s.walkIns.length;
  const bookedLabel = people(s.roster.length);
  const channels = smsOn ? "SMS and email" : "email";
  const textLine = smsNumber ? ` to ${smsNumber}` : "";

  function run(fn: () => Promise<Result>, after?: (r: Result) => void) {
    setError(null);
    start(async () => {
      try {
        const r = await fn();
        if (r && !r.ok) setError(r.error);
        else after?.(r);
      } catch {
        setError("We couldn't reach StepUp. Check your connection and try again.");
      }
    });
  }

  const mark = (row: SheetRosterRow, to: "ATTENDED" | "NO_SHOW") =>
    run(() => markAttendanceAction(row.bookingId, row.status === to ? null : to, link));

  return (
    <section
      id="class-sheet"
      aria-labelledby="sheet-title"
      className="su-panel-in"
      style={{
        marginBottom: 36,
        border: "1.5px solid oklch(22% 0.02 60)",
        borderRadius: 28,
        background: "oklch(99% 0.005 70)",
        padding: "26px clamp(16px, 3vw, 32px) 30px",
        scrollMarginTop: 90,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 18 }}>
        <div>
          <div className="sd-kicker" style={{ marginBottom: 4 }}>
            {s.past ? "Past class" : "Upcoming class"}
          </div>
          <h2 id="sheet-title" className="sd-h2">
            {s.title}
          </h2>
          <div className="sd-hint" style={{ marginTop: 4 }}>
            {s.whenLabel} · {s.venueName} · with {s.teacherName}
          </div>
        </div>
        {closeHref && <CloseButton onClick={() => router.push(closeHref, { scroll: false })} label="Close class" />}
      </div>

      <div role="tablist" aria-label="Class tools" className="no-print" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 22 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setError(null);
            }}
            className="su-btn"
            style={{
              cursor: "pointer",
              font: "inherit",
              fontWeight: 700,
              fontSize: 14.5,
              padding: "9px 18px",
              borderRadius: 999,
              border: `1.5px solid ${tab === t.id ? "oklch(22% 0.02 60)" : "oklch(86% 0.012 70)"}`,
              background: tab === t.id ? "oklch(22% 0.02 60)" : "transparent",
              color: tab === t.id ? "oklch(97% 0.01 70)" : "oklch(30% 0.02 60)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="sd-err" style={{ fontSize: 15, marginBottom: 14 }}>
          {error}
        </div>
      )}

      {tab === "list" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(20px, 3vw, 36px)", alignItems: "flex-start" }}>
          <div style={{ flex: "999 1 380px", minWidth: 0, maxWidth: 520 }}>
            <div className="sd-card" style={{ padding: "18px 18px 8px", borderRadius: 22 }}>
              <div style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 800, fontSize: 18 }}>{s.title}</div>
              <div className="sd-hint">
                {s.whenLabel} · {`${booked} booked · ${firsts} first-timers · ${attended} attended`}
              </div>
              {s.partner && s.roleSummary && <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4 }}>{s.roleSummary}</div>}
              {!s.canMark && !s.past && (
                <div className="sd-hint" style={{ marginTop: 6 }}>
                  Attended and No-show open an hour before class.
                </div>
              )}
              <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0 }}>
                {s.roster.length === 0 && s.walkIns.length === 0 && (
                  <li className="sd-hint" style={{ padding: "12px 0 16px" }}>
                    Nobody booked yet.
                  </li>
                )}
                {s.roster.map((r) => (
                  <li key={r.bookingId} style={{ padding: "12px 0", borderTop: "1px solid oklch(93% 0.008 70)", display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 15.5, marginRight: 4 }}>{r.name}</span>
                      {r.first && (
                        <span className="sd-chip" style={{ background: "oklch(94% 0.05 85)", color: "oklch(38% 0.09 70)" }}>
                          1st class
                        </span>
                      )}
                      {r.role && (
                        <span className="sd-chip" style={{ background: "oklch(93% 0.02 250)", color: "oklch(35% 0.06 250)" }}>
                          {ROLE_LABEL[r.role as DanceRole] ?? r.role}
                        </span>
                      )}
                      {r.status === "PENDING_PAYMENT" && (
                        <span className="sd-chip" style={{ background: "oklch(93% 0.01 70)", color: "oklch(40% 0.02 60)" }}>
                          Paying
                        </span>
                      )}
                    </div>
                    {r.note && <div style={{ fontSize: 13.5, color: "oklch(38% 0.02 60)" }}>“{r.note}”</div>}
                    {r.status !== "PENDING_PAYMENT" && (
                      <div className="no-print" style={{ display: "flex", gap: 8 }}>
                        <MarkButton on={r.status === "ATTENDED"} disabled={!s.canMark || pending} onClick={() => mark(r, "ATTENDED")} label={`Mark ${r.name} attended`} tone="good">
                          Attended
                        </MarkButton>
                        <MarkButton on={r.status === "NO_SHOW"} disabled={!s.canMark || pending} onClick={() => mark(r, "NO_SHOW")} label={`Mark ${r.name} no-show`} tone="bad">
                          No-show
                        </MarkButton>
                      </div>
                    )}
                  </li>
                ))}
                {s.walkIns.map((w) => (
                  <li key={w.id} style={{ padding: "12px 0", borderTop: "1px solid oklch(93% 0.008 70)", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 15.5, marginRight: 4 }}>{w.name}</span>
                    <span className="sd-chip" style={{ background: "oklch(93% 0.06 150)", color: "oklch(30% 0.08 150)" }}>
                      Walk-in
                    </span>
                    {w.role && (
                      <span className="sd-chip" style={{ background: "oklch(93% 0.02 250)", color: "oklch(35% 0.06 250)" }}>
                        {ROLE_LABEL[w.role as DanceRole] ?? w.role}
                      </span>
                    )}
                    <button
                      type="button"
                      className="sd-btn-ghost no-print"
                      style={{ marginLeft: "auto", padding: "6px 12px", fontSize: 13 }}
                      disabled={pending}
                      aria-label={`Remove walk-in ${w.name}`}
                      onClick={() => run(() => removeWalkInAction(w.id, link))}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              {!s.past && (
                <form
                  className="no-print"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData();
                    fd.set("name", walkName);
                    if (s.partner) fd.set("role", walkRole);
                    run(() => addWalkInAction(s.id, fd, link), (r) => {
                      setWalkName("");
                      if (r?.ok) setToast(r.message);
                    });
                  }}
                  style={{ borderTop: "1px solid oklch(93% 0.008 70)", padding: "14px 0 10px", display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <label htmlFor="walkin-name" style={{ fontWeight: 700, fontSize: 14 }}>
                    + Walk-in
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <input
                      id="walkin-name"
                      className="su-fld"
                      style={{ flex: "1 1 180px", height: 46 }}
                      value={walkName}
                      maxLength={80}
                      onChange={(e) => setWalkName(e.target.value)}
                      placeholder="Name at the door"
                    />
                    {s.partner && (
                      <select className="su-fld" aria-label="Role" style={{ flex: "0 1 130px", height: 46 }} value={walkRole} onChange={(e) => setWalkRole(e.target.value as DanceRole)}>
                        <option value="LEAD">Lead</option>
                        <option value="FOLLOW">Follow</option>
                        <option value="EITHER">Either</option>
                      </select>
                    )}
                    <button type="submit" className="sd-btn" disabled={pending || !walkName.trim()}>
                      Add
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
          <div style={{ flex: "1 1 280px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="sd-h3">What the teacher sees</div>
            <p style={{ margin: 0, fontSize: 14.5, color: "oklch(35% 0.02 60)" }}>
              This list opens from the email the teacher gets 48 hours before class. One tap marks each student attended or no-show; no-shows
              count towards your no-show policy. Walk-ins keep the head count right.
            </p>
            {s.partner && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "14px 16px", borderRadius: 16, background: "oklch(96% 0.01 70)" }}>
                <strong>Role waitlists</strong>
                <span>Leads waiting: {s.waitLeads.length ? s.waitLeads.join(", ") : "none"}</span>
                <span>Follows waiting: {s.waitFollows.length ? s.waitFollows.join(", ") : "none"}</span>
                {s.waitOthers.length > 0 && <span>Either: {s.waitOthers.join(", ")}</span>}
                <span className="sd-hint">{s.ruleLabel}</span>
              </div>
            )}
            {!s.partner && s.waitOthers.length > 0 && (
              <div className="sd-hint">Waitlist: {s.waitOthers.join(", ")}</div>
            )}
            <div className="no-print" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {link ? (
                <PrintButton label="Print sign-in sheet" />
              ) : (
                <>
                  <a href={`/studio/csv/roster?class=${s.id}`} className="sd-btn-ghost" download>
                    Export CSV
                  </a>
                  <a href={`/studio/classes/${s.id}/print`} target="_blank" rel="noopener" className="sd-btn-ghost">
                    Print sign-in sheet
                  </a>
                </>
              )}
            </div>
            <span className="sd-hint">Using your own booking system too? Keep your own list. This one only has to be quick to check.</span>
          </div>
        </div>
      )}

      {tab === "msg" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(20px, 3vw, 36px)", alignItems: "flex-start" }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData();
              fd.set("body", msg);
              run(() => messageClassAction(s.id, fd, link), (r) => {
                setMsg("");
                if (r?.ok) setToast(r.message);
              });
            }}
            style={{ flex: "999 1 360px", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div role="group" aria-label="Quick templates" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {MSG_TEMPLATES.map(([label, text]) => (
                <button key={label} type="button" className="sd-btn-ghost" style={{ padding: "8px 14px", fontSize: 14 }} onClick={() => setMsg(text)}>
                  {label}
                </button>
              ))}
            </div>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Message to {bookedLabel}</span>
              <textarea className="su-fld" maxLength={320} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="We're in Studio B tonight." />
              <span className="sd-hint">
                {`Sent by ${channels} from StepUp${smsOn ? "’s number" : ""}. Your own number stays private. ${320 - msg.length} characters left.`}
              </span>
            </label>
            <div>
              <button type="submit" className="sd-btn" disabled={pending || !msg.trim() || s.roster.length === 0}>
                {pending ? "Sending…" : `Send to ${bookedLabel}`}
              </button>
            </div>
            {smsNumber && (
              <div className="sd-hint">
                Teachers can also text <strong>msg {s.textKey}: we&apos;re in studio B</strong>
                {textLine}, the same number used for cancel by text.
              </div>
            )}
          </form>
          <div style={{ flex: "1 1 260px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="sd-h3">Sent for this class</div>
            {s.messages.length === 0 && <div className="sd-hint">Nothing sent yet. Everything sent is kept here so managers can see it.</div>}
            {s.messages.map((m) => (
              <div key={m.id} style={{ padding: "12px 14px", borderRadius: 14, background: "oklch(96% 0.01 70)" }}>
                <div style={{ fontSize: 14.5 }}>“{m.body}”</div>
                <div className="sd-hint" style={{ marginTop: 4 }}>
                  {m.meta}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "move" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!moveVenue) {
              setError("Pick where it's moving to.");
              return;
            }
            const fd = new FormData();
            fd.set("venue", moveVenue);
            fd.set("scope", moveScope);
            run(() => moveClassAction(s.id, fd), (r) => {
              if (r?.ok) setToast(r.message);
              router.push("/studio", { scroll: false });
            });
          }}
          style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 720 }}
        >
          <fieldset style={{ border: 0, margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <legend style={{ fontWeight: 800, fontSize: 16, marginBottom: 10, padding: 0 }}>New location</legend>
            {venues.map((v) => {
              const current = (v.id === "studio" ? null : v.id) === s.venueId;
              return (
                <label key={v.id} className="sd-radio-card" style={current ? { opacity: 0.6 } : undefined}>
                  <input type="radio" name="move-venue" disabled={current} checked={moveVenue === v.id} onChange={() => setMoveVenue(v.id)} />
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <strong>{v.name}</strong>
                    <span className="sd-hint">
                      {v.address}
                      {current ? " · where it is now" : ""}
                    </span>
                  </span>
                </label>
              );
            })}
            {venues.length < 2 && <span className="sd-hint">Add another venue in Profile to move classes there.</span>}
          </fieldset>
          {s.hasSeries && (
            <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
              <legend style={{ fontWeight: 800, fontSize: 16, marginBottom: 10, padding: 0 }}>Which classes</legend>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {(
                  [
                    ["one", "This class only"],
                    ["future", "This and all future classes"],
                  ] as const
                ).map(([id, label]) => (
                  <label key={id} className="sd-radio-card" style={{ flex: "1 1 220px" }}>
                    <input type="radio" name="move-scope" checked={moveScope === id} onChange={() => setMoveScope(id)} />
                    <strong>{label}</strong>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div style={{ padding: "14px 16px", borderRadius: 16, background: "oklch(96% 0.01 70)", fontSize: 14.5 }}>
            {`The class and its bookings stay as they are. ${s.roster.length ? `All ${bookedLabel} get ${smsOn ? "an SMS and email" : "an email"} with the new address` : "Anyone who books from now sees the new address"}, and anyone who can't make the new location can cancel free.`}
          </div>
          {smsNumber && (
            <div className="sd-hint">
              Teachers can also text <strong>move {s.textKey} to redfern hall</strong>
              {textLine}.
            </div>
          )}
          <div>
            <button type="submit" className="sd-btn" disabled={pending || !moveVenue}>
              {pending ? "Moving…" : "Move class and tell students"}
            </button>
          </div>
        </form>
      )}

      {tab === "cancel" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => cancelClassFromSheetAction(s.id, reason), (r) => {
              if (r?.ok) setToast(r.message);
              router.push("/studio", { scroll: false });
            });
          }}
          style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 360 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Reason (shown to students)</span>
            <select className="su-fld" value={reason} onChange={(e) => setReason(e.target.value)}>
              {CANCEL_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "16px 18px", borderRadius: 16, background: "oklch(96% 0.01 70)" }}>
            <strong>What students see: same studio first</strong>
            <span>
              {s.roster.length
                ? `${bookedLabel} get a full refund to their original payment, or their credit back. Before anything else, StepUp shows them your other classes:`
                : "Nobody's booked yet. Anyone on the waitlist is told, and shown your other classes:"}
            </span>
            {s.recovery.length ? (
              <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
                {s.recovery.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            ) : (
              <span className="sd-hint">You have no other upcoming classes on StepUp to show them yet.</span>
            )}
            <span className="sd-hint">StepUp never markets other studios to a student because they booked with you.</span>
          </div>
          {smsNumber && (
            <div className="sd-hint">
              Teachers can also text <strong>cancel {s.textKey}</strong>
              {textLine}.
            </div>
          )}
          <div>
            <button type="submit" className="sd-btn" disabled={pending} style={{ background: "oklch(48% 0.17 30)" }}>
              {pending ? "Cancelling…" : "Cancel this class"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function MarkButton({
  on,
  disabled,
  onClick,
  label,
  tone,
  children,
}: {
  on: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
  tone: "good" | "bad";
  children: React.ReactNode;
}) {
  const color = tone === "good" ? "oklch(45% 0.12 150)" : "oklch(48% 0.17 30)";
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="su-btn"
      style={{
        flex: "1 1 0",
        cursor: disabled ? "default" : "pointer",
        font: "inherit",
        fontWeight: 700,
        fontSize: 14,
        padding: "10px 12px",
        borderRadius: 12,
        border: `1.5px solid ${on ? color : "oklch(86% 0.012 70)"}`,
        background: on ? color : "transparent",
        color: on ? "#fff" : "oklch(30% 0.02 60)",
        opacity: disabled && !on ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  );
}
