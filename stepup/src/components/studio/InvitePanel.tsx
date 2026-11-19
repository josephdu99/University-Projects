"use client";

import { startTransition, useState } from "react";
import { DISPLAY } from "@/lib/marketing-theme";
import { sendInvitesAction, setOwnerTeachesAction, type SentInvite } from "@/lib/actions/studio-actions";
import { MAX_INVITES_PER_SEND, firstName, invitePrefix, isAuMobile, isEmail } from "@/lib/team";
import { errStyle, hintStyle } from "@/components/onboarding/fields";
import { PANEL_ID, useStudioPanels } from "./StudioPanels";

type Row = { key: number; name: string; contact: string; role: "TEACHER" | "MANAGER" };

let nextKey = 1;
const newRow = (): Row => ({ key: nextKey++, name: "", contact: "", role: "TEACHER" });

const isContact = (v: string) => isEmail(v) || isAuMobile(v);

export function InvitePanel({
  studioName,
  inviterName,
  ownerTeaches,
  origin,
}: {
  studioName: string;
  inviterName: string;
  /** Whether the person looking can currently be picked as a teacher. */
  ownerTeaches: boolean;
  /** This deployment's address, for the join link in the message. */
  origin: string;
}) {
  const { open, close, setToast } = useStudioPanels();
  const [rows, setRows] = useState<Row[]>(() => [newRow()]);
  const [teaches, setTeaches] = useState(ownerTeaches);
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // Invites to mobiles, which StepUp can't text yet: shown so they can be
  // sent by hand.
  const [toText, setToText] = useState<SentInvite[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  if (open !== "invite") return null;

  const prefix = invitePrefix(studioName);
  const valid = rows.filter((r) => r.name.trim() && isContact(r.contact));
  const bad = rows.filter((r) => (r.name.trim() || r.contact.trim()) && !(r.name.trim() && isContact(r.contact)));
  const probs = [
    ...(bad.length ? ["a name and a valid email or mobile for each teacher"] : []),
    ...(valid.length === 0 ? ["at least one teacher"] : []),
    ...(valid.length > MAX_INVITES_PER_SEND ? [`no more than ${MAX_INVITES_PER_SEND} at once`] : []),
  ];
  const message = (code: string) =>
    `${firstName(inviterName)} from ${studioName} invited you to teach on StepUp. Join here: ${origin}/join/${code}`;

  const update = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function toggleTeaches() {
    const next = !teaches;
    setTeaches(next);
    startTransition(() => setOwnerTeachesAction(next));
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (probs.length) {
      setTried(true);
      return;
    }
    const fd = new FormData();
    for (const r of valid) {
      fd.append("inviteName", r.name);
      fd.append("inviteContact", r.contact);
      fd.append("inviteRole", r.role);
    }
    setPending(true);
    setServerError(null);
    try {
      const res = await sendInvitesAction(undefined, fd);
      if (!res?.ok) {
        setServerError(res?.error ?? "Something went wrong. Try again.");
        return;
      }
      const emailed = res.sent.filter((s) => s.kind === "email").length;
      const texts = res.sent.filter((s) => s.kind === "mobile");
      const parts = [
        res.sent.length
          ? `${res.sent.length} ${res.sent.length === 1 ? "invite" : "invites"} ready${emailed ? `, ${emailed} emailed` : ""}. Teachers show as “Invite sent” until they join.`
          : "",
        ...res.skipped.map((s) => `${s}.`),
      ].filter(Boolean);
      setToast(parts.join(" "));
      setRows([newRow()]);
      setTried(false);
      if (texts.length) {
        setToText(texts);
      } else {
        close();
      }
    } catch {
      setServerError("We couldn't reach StepUp. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(message(code));
      setCopied(code);
    } catch {
      setCopied(null);
    }
  }

  const shell: React.CSSProperties = {
    margin: 0,
    padding: "26px clamp(18px, 3vw, 28px) 28px",
    borderTop: "1.5px solid oklch(22% 0.02 60)",
    background: "oklch(97.5% 0.012 70)",
    display: "flex",
    flexDirection: "column",
    gap: 18,
    scrollMarginTop: 90,
  };

  if (toText.length) {
    return (
      <div id={PANEL_ID.invite} className="su-panel-in" style={shell}>
        <h3 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 22, margin: 0 }}>Text these yourself</h3>
        <p style={{ margin: 0, fontSize: 15, color: "oklch(44% 0.02 60)", maxWidth: "60ch" }}>
          {`StepUp can't send texts yet, so ${toText.length === 1 ? "this invite needs" : "these invites need"} to go from your phone. Each code works once and runs out in 14 days.`}
        </p>
        {toText.map((s) => (
          <div
            key={s.code}
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              borderRadius: 16,
              background: "oklch(99.5% 0.004 70)",
              border: "1px solid oklch(88% 0.01 70)",
            }}
          >
            <span style={{ minWidth: 0 }}>
              <strong>{s.name}</strong> · {s.contact}
              <br />
              <span style={{ ...hintStyle, overflowWrap: "anywhere" }}>“{message(s.code)}”</span>
            </span>
            <span style={{ display: "flex", gap: 8 }}>
              <a
                href={`sms:${s.contact.replace(/\s/g, "")}?&body=${encodeURIComponent(message(s.code))}`}
                className="su-btn"
                style={{ fontWeight: 700, fontSize: 14, padding: "9px 14px", borderRadius: 999, border: "1.5px solid oklch(22% 0.02 60)", color: "oklch(22% 0.02 60)", textDecoration: "none" }}
              >
                Open Messages
              </a>
              <button
                type="button"
                className="su-btn"
                onClick={() => copy(s.code)}
                style={{ cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 14, padding: "9px 14px", borderRadius: 999, border: 0, background: "oklch(22% 0.02 60)", color: "#fff" }}
              >
                {copied === s.code ? "Copied" : "Copy message"}
              </button>
            </span>
          </div>
        ))}
        <button
          type="button"
          className="su-btn"
          onClick={() => {
            setToText([]);
            setCopied(null);
            close();
          }}
          style={{ alignSelf: "flex-start", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 15, padding: "12px 20px", borderRadius: 999, border: "1.5px solid oklch(22% 0.02 60)", background: "transparent" }}
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form
      id={PANEL_ID.invite}
      onSubmit={send}
      noValidate
      aria-labelledby="invite-title"
      className="su-panel-in su-compact"
      style={shell}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <h3 id="invite-title" style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 22, margin: "0 0 4px" }}>
            Invite your teachers
          </h3>
          <p style={{ margin: 0, fontSize: 15, color: "oklch(44% 0.02 60)", maxWidth: "60ch" }}>
            Each teacher gets a code to join {studioName}. They make their own login and teacher
            profile; you stay in charge of the timetable and payments.
          </p>
        </div>
        <button
          type="button"
          className="su-btn"
          onClick={close}
          aria-label="Close invite teachers"
          style={{ flex: "none", width: 38, height: 38, borderRadius: "50%", border: "1px solid oklch(86% 0.012 70)", background: "transparent", cursor: "pointer", fontSize: 19, lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      <label
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
          cursor: "pointer",
          padding: "14px 16px",
          borderRadius: 16,
          background: "oklch(99.5% 0.004 70)",
          border: "1px solid oklch(88% 0.01 70)",
        }}
      >
        <input
          type="checkbox"
          checked={teaches}
          onChange={toggleTeaches}
          style={{ width: 20, height: 20, margin: "2px 0 0", accentColor: "oklch(58% 0.19 35)", flexShrink: 0 }}
        />
        <span>
          <strong>I teach classes here too.</strong>{" "}
          <span style={hintStyle}>You can then be picked as the teacher for a class.</span>
        </span>
      </label>

      {rows.map((r, i) => {
        const filled = r.name.trim() || r.contact.trim();
        const ok = r.name.trim() && isContact(r.contact);
        const note = ok
          ? `Gets their own invite code, ${prefix}-······, when you send.`
          : filled
            ? r.contact.trim() && !isContact(r.contact)
              ? "Use an email or an Australian mobile (04…)."
              : "Add a name and an email or mobile."
            : "Leave blank to skip.";
        return (
          <fieldset
            key={r.key}
            style={{
              border: "1px solid oklch(86% 0.012 70)",
              borderRadius: 18,
              margin: 0,
              padding: "14px 16px",
              background: "oklch(99.5% 0.004 70)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              minWidth: 0,
            }}
          >
            <legend style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 14, padding: "0 6px" }}>
              Teacher {i + 1}
            </legend>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))", gap: 10, alignItems: "end" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Name</span>
                <input className="su-fld" value={r.name} maxLength={60} onChange={(e) => update(r.key, { name: e.target.value })} placeholder="Maya Torres" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Email or mobile</span>
                <input
                  className="su-fld"
                  value={r.contact}
                  maxLength={120}
                  aria-invalid={Boolean(tried && filled && !ok)}
                  onChange={(e) => update(r.key, { contact: e.target.value })}
                  placeholder="maya@email.com"
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Access</span>
                <select
                  className="su-fld"
                  value={r.role}
                  onChange={(e) => update(r.key, { role: e.target.value === "MANAGER" ? "MANAGER" : "TEACHER" })}
                >
                  <option value="TEACHER">Teacher</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={filled && !ok && tried ? errStyle : hintStyle}>{note}</span>
              <button
                type="button"
                className="su-btn"
                onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : [newRow()]))}
                aria-label={`Remove teacher ${i + 1}`}
                style={{ border: 0, background: "transparent", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13.5, color: "oklch(42% 0.02 60)", padding: "6px 4px" }}
              >
                Remove
              </button>
            </div>
          </fieldset>
        );
      })}

      {rows.length < MAX_INVITES_PER_SEND && (
        <button
          type="button"
          className="su-btn"
          onClick={() => setRows((rs) => [...rs, newRow()])}
          style={{ alignSelf: "flex-start", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 14.5, padding: "10px 16px", borderRadius: 999, border: "1.5px dashed oklch(22% 0.02 60)", background: "transparent" }}
        >
          + Add another teacher
        </button>
      )}

      <div style={{ padding: "14px 16px", borderRadius: 16, background: "oklch(94% 0.045 65)", display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "oklch(42% 0.15 38)" }}>
          WHAT THEY&apos;LL GET
        </span>
        <span style={{ fontSize: 15, overflowWrap: "anywhere" }}>“{message(`${prefix}-······`)}”</span>
        <span style={hintStyle}>
          We email it to email addresses. For mobiles you send it yourself: we&apos;ll give you the
          message to copy. Teachers see the classes they teach and who has booked. Managers can also
          edit the timetable and invite people.
        </span>
      </div>

      {serverError && (
        <div role="alert" style={{ ...errStyle, fontSize: 15 }}>
          {serverError}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          className="su-btn"
          onClick={close}
          style={{ border: 0, background: "transparent", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 15, padding: "12px 4px", color: "oklch(42% 0.02 60)" }}
        >
          Cancel
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span role="status" style={tried && probs.length ? errStyle : hintStyle}>
            {tried && probs.length ? `Still needed: ${probs.join(", ")}` : ""}
          </span>
          <button
            type="submit"
            className="su-btn"
            disabled={pending}
            style={{
              border: 0,
              cursor: pending ? "progress" : "pointer",
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: 16,
              padding: "14px 24px",
              borderRadius: 999,
              background: probs.length ? "oklch(88% 0.01 70)" : "oklch(22% 0.02 60)",
              color: probs.length ? "oklch(40% 0.02 60)" : "#fff",
            }}
          >
            {pending ? "Sending…" : valid.length ? `Send ${valid.length} ${valid.length === 1 ? "invite" : "invites"}` : "Send invites"}
          </button>
        </div>
      </div>
    </form>
  );
}
