"use client";

import { useActionState, useState } from "react";
import { useSession } from "next-auth/react";
import {
  changePasswordAction,
  updateLeaderboardVisibilityAction,
  updateProfileAction,
} from "@/lib/actions/auth-actions";
import { AVATAR_COLORS } from "@/lib/avatar-colors";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { COMMON_TIMEZONES } from "@/lib/time";
import { initialsOf } from "@/lib/style-chips";

const panel: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 24,
  padding: "32px clamp(22px, 4vw, 36px)",
};

const heading: React.CSSProperties = {
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

const field: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
  fontSize: 15.5,
  padding: "13px 16px",
  borderRadius: 14,
  border: "1.5px solid oklch(88% 0.012 70)",
  background: C.bg,
  color: C.ink,
};

const primaryBtn: React.CSSProperties = {
  whiteSpace: "nowrap",
  cursor: "pointer",
  fontFamily: "inherit",
  fontWeight: 700,
  fontSize: 15,
  padding: "14px 28px",
  borderRadius: 999,
  border: "none",
  background: C.brand,
  color: C.onBrand,
};

const outlineBtn: React.CSSProperties = {
  ...primaryBtn,
  fontWeight: 600,
  padding: "13px 26px",
  background: "transparent",
  border: "1.5px solid oklch(89% 0.012 70)",
  color: "oklch(30% 0.02 60)",
};

function Notice({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return (
    <p
      role={error ? "alert" : undefined}
      style={{
        margin: "0 0 16px",
        padding: "10px 14px",
        borderRadius: 12,
        fontSize: 14,
        background: error ? "oklch(96% 0.04 30)" : "oklch(95% 0.05 145)",
        color: error ? "oklch(48% 0.16 30)" : "oklch(42% 0.13 145)",
      }}
    >
      {error ?? success}
    </p>
  );
}

export function EditProfilePanel({
  defaults,
}: {
  defaults: { name: string; homeCity: string; timezone: string; avatarColor: string };
}) {
  const { update } = useSession();
  const [colour, setColour] = useState(defaults.avatarColor);
  const [name, setName] = useState(defaults.name);

  const [state, formAction] = useActionState(
    async (prev: Awaited<ReturnType<typeof updateProfileAction>>, fd: FormData) => {
      const result = await updateProfileAction(prev, fd);
      // Refresh the JWT so the nav name updates without a reload.
      if (result?.success) await update();
      return result;
    },
    undefined
  );

  const zones = Array.from(new Set([defaults.timezone, ...COMMON_TIMEZONES]));

  return (
    <section style={panel}>
      <h2 style={heading}>Edit profile</h2>
      <form action={formAction}>
        <input type="hidden" name="avatarColor" value={colour} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 18,
            marginBottom: 24,
          }}
        >
          <div>
            <label style={labelStyle} htmlFor="profile-name">
              Name
            </label>
            <input
              id="profile-name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={field}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="profile-city">
              City
            </label>
            <input
              id="profile-city"
              name="homeCity"
              defaultValue={defaults.homeCity}
              style={field}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="profile-tz">
              Timezone
            </label>
            <select
              id="profile-tz"
              name="timezone"
              defaultValue={defaults.timezone}
              style={field}
            >
              {zones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 26 }}>
          <span id="swatch-label" style={labelStyle}>
            Avatar colour
          </span>
          <p style={{ fontSize: 13.5, color: C.label, margin: "0 0 12px" }}>
            Your initials, in the colour you pick.
          </p>
          <div
            role="radiogroup"
            aria-labelledby="swatch-label"
            style={{ display: "flex", flexWrap: "wrap", gap: 12 }}
          >
            {AVATAR_COLORS.map((c, i) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={colour === c}
                aria-label={`Avatar colour ${i + 1}`}
                onClick={() => setColour(c)}
                style={{
                  flex: "none",
                  padding: 3,
                  borderRadius: 999,
                  cursor: "pointer",
                  background: "none",
                  border: `2px solid ${colour === c ? C.brand : "transparent"}`,
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    background: c,
                    color: C.onBrand,
                    fontFamily: DISPLAY,
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
                  {initialsOf(name || defaults.name)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <Notice error={state?.error} success={state?.success} />

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
          <button type="submit" style={primaryBtn}>
            Save changes
          </button>
          <span style={{ fontSize: 13.5, color: "oklch(55% 0.02 60)" }}>
            Your city only shows to studios you book with.
          </span>
        </div>
      </form>
    </section>
  );
}

export function PasswordPanel() {
  const [state, formAction] = useActionState(changePasswordAction, undefined);

  return (
    <section style={panel}>
      <h2 style={heading}>Change password</h2>
      <form action={formAction}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 18,
            marginBottom: 24,
          }}
        >
          <div>
            <label style={labelStyle} htmlFor="pw-current">
              Current password
            </label>
            <input
              id="pw-current"
              name="current"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              style={field}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="pw-new">
              New password
            </label>
            <input
              id="pw-new"
              name="password"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              placeholder="••••••••"
              style={field}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="pw-confirm">
              Confirm new password
            </label>
            <input
              id="pw-confirm"
              name="confirm"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              style={field}
            />
          </div>
        </div>

        <Notice error={state?.error} success={state?.success} />

        <button type="submit" style={outlineBtn}>
          Update password
        </button>
      </form>
    </section>
  );
}

/** The opt-in the leaderboard's "Hide me from boards" link points at. */
export function VisibilityPanel({ optedIn }: { optedIn: boolean }) {
  const [state, formAction] = useActionState(
    updateLeaderboardVisibilityAction,
    undefined
  );

  return (
    <section style={panel} id="visibility">
      <h2 style={heading}>Leaderboard visibility</h2>
      <p style={{ fontSize: 14.5, color: C.label, margin: "0 0 20px", maxWidth: 560 }}>
        {optedIn
          ? "Your name, initials, city and class count appear on the monthly leaderboard for other dancers. Studios cannot see it."
          : "You are not on the leaderboard. Nobody but you can see your row."}
      </p>

      <Notice error={state?.error} success={state?.success} />

      <form action={formAction}>
        <input type="hidden" name="optIn" value={optedIn ? "false" : "true"} />
        <button type="submit" style={outlineBtn}>
          {optedIn ? "Hide me from boards" : "Show me on boards"}
        </button>
      </form>
    </section>
  );
}
