"use client";

import { useActionState, useState } from "react";
import { useSession } from "next-auth/react";
import {
  updateProfileAction,
  changePasswordAction,
} from "@/lib/actions/auth-actions";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { initialsOf } from "@/lib/style-chips";
import { COMMON_TIMEZONES } from "@/lib/time";
import { AVATAR_SWATCHES } from "@/lib/avatar-colors";

const cardStyle: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 24,
  padding: "32px clamp(20px, 3vw, 36px)",
};

const h2Style: React.CSSProperties = {
  fontFamily: DISPLAY,
  fontWeight: 800,
  fontSize: 24,
  letterSpacing: "-0.02em",
  margin: "0 0 24px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13.5,
  fontWeight: 600,
  color: "oklch(38% 0.02 60)",
  marginBottom: 7,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
  fontSize: 15.5,
  padding: "13px 16px",
  borderRadius: 14,
  border: "1.5px solid oklch(88% 0.012 70)",
  background: C.bg,
  color: C.ink,
  outline: "none",
};

function Notice({ tone, children }: { tone: "ok" | "bad"; children: React.ReactNode }) {
  const palette =
    tone === "ok"
      ? { bg: "oklch(94% 0.06 155)", fg: "oklch(42% 0.11 155)" }
      : { bg: "oklch(95% 0.05 25)", fg: "oklch(45% 0.16 25)" };
  return (
    <p
      role={tone === "bad" ? "alert" : "status"}
      style={{
        background: palette.bg,
        color: palette.fg,
        borderRadius: 12,
        padding: "10px 14px",
        fontSize: 14,
        margin: "0 0 18px",
      }}
    >
      {children}
    </p>
  );
}

export function EditProfileCard({
  defaults,
}: {
  defaults: {
    name: string;
    homeCity: string;
    timezone: string;
    avatarColor: string;
    /** Carried through untouched — the emoji avatar is gone from this page
        but other surfaces still read the field. */
    avatarEmoji: string;
  };
}) {
  const { update } = useSession();
  const [colour, setColour] = useState(defaults.avatarColor);
  const [name, setName] = useState(defaults.name);

  const [state, formAction] = useActionState(
    async (prev: Awaited<ReturnType<typeof updateProfileAction>>, fd: FormData) => {
      const result = await updateProfileAction(prev, fd);
      // Refresh the JWT so the nav avatar picks the new colour up immediately.
      if (result?.success) await update();
      return result;
    },
    undefined
  );

  const zones = Array.from(new Set([defaults.timezone, ...COMMON_TIMEZONES]));

  return (
    <section style={cardStyle}>
      <h2 style={h2Style}>Edit profile</h2>

      <form action={formAction}>
        <input type="hidden" name="avatarEmoji" value={defaults.avatarEmoji} />
        <input type="hidden" name="avatarColor" value={colour} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))",
            gap: 18,
            marginBottom: 24,
          }}
        >
          <div>
            <label style={labelStyle} htmlFor="pf-name">
              Name
            </label>
            <input
              id="pf-name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="pf-city">
              City
            </label>
            <input
              id="pf-city"
              name="homeCity"
              defaultValue={defaults.homeCity}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="pf-tz">
              Timezone
            </label>
            <select
              id="pf-tz"
              name="timezone"
              defaultValue={defaults.timezone}
              style={inputStyle}
            >
              {zones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset style={{ border: "none", padding: 0, margin: "0 0 26px" }}>
          <legend style={{ ...labelStyle, marginBottom: 5, padding: 0 }}>
            Avatar colour
          </legend>
          <p style={{ fontSize: 13.5, color: "oklch(52% 0.02 60)", margin: "0 0 12px" }}>
            Your initials, in the colour you pick.
          </p>
          <div
            role="radiogroup"
            aria-label="Avatar colour"
            style={{ display: "flex", flexWrap: "wrap", gap: 12 }}
          >
            {AVATAR_SWATCHES.map((s) => {
              const on = colour === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={s.name}
                  onClick={() => setColour(s.value)}
                  style={{
                    flex: "none",
                    padding: 3,
                    borderRadius: 999,
                    cursor: "pointer",
                    background: "none",
                    border: `2px solid ${on ? C.brand : "transparent"}`,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      width: 44,
                      height: 44,
                      borderRadius: 999,
                      background: s.value,
                      color: C.onBrand,
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: DISPLAY,
                      fontWeight: 700,
                      fontSize: 15,
                    }}
                  >
                    {initialsOf(name || defaults.name)}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {state?.error && <Notice tone="bad">{state.error}</Notice>}
        {state?.success && <Notice tone="ok">{state.success}</Notice>}

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
          <SaveButton />
          <span style={{ fontSize: 13.5, color: "oklch(55% 0.02 60)" }}>
            Your city only shows to studios you book with.
          </span>
        </div>
      </form>
    </section>
  );
}

function SaveButton() {
  return (
    <button
      type="submit"
      style={{
        whiteSpace: "nowrap",
        fontFamily: "inherit",
        fontWeight: 700,
        fontSize: 15,
        padding: "14px 28px",
        border: "none",
        borderRadius: 999,
        background: C.brand,
        color: C.onBrand,
        cursor: "pointer",
      }}
    >
      Save changes
    </button>
  );
}

export function ChangePasswordCard() {
  const [state, formAction] = useActionState(changePasswordAction, undefined);

  const fields = [
    { name: "currentPassword", label: "Current password", autoComplete: "current-password" },
    { name: "newPassword", label: "New password", autoComplete: "new-password" },
    { name: "confirmPassword", label: "Confirm new password", autoComplete: "new-password" },
  ];

  return (
    <section style={cardStyle}>
      <h2 style={h2Style}>Change password</h2>
      <form action={formAction}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
            gap: 18,
            marginBottom: 24,
          }}
        >
          {fields.map((f) => (
            <div key={f.name}>
              <label style={labelStyle} htmlFor={`pw-${f.name}`}>
                {f.label}
              </label>
              <input
                id={`pw-${f.name}`}
                name={f.name}
                type="password"
                required
                autoComplete={f.autoComplete}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        {state?.error && <Notice tone="bad">{state.error}</Notice>}
        {state?.success && <Notice tone="ok">{state.success}</Notice>}

        {/* Ghost on purpose, so the page keeps one primary action. */}
        <button
          type="submit"
          className="stepup-ghost-pill"
          style={{
            display: "inline-block",
            whiteSpace: "nowrap",
            fontFamily: "inherit",
            fontWeight: 600,
            fontSize: 15,
            padding: "13px 26px",
            borderRadius: 999,
            border: "1.5px solid oklch(89% 0.012 70)",
            background: "transparent",
            color: "oklch(30% 0.02 60)",
            cursor: "pointer",
          }}
        >
          Update password
        </button>
      </form>
    </section>
  );
}
