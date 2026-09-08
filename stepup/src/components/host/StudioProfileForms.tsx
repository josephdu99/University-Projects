"use client";

import { useActionState, useState } from "react";
import { useSession } from "next-auth/react";
import {
  changePasswordAction,
  updateProfileAction,
  updateStudioAction,
} from "@/lib/actions/auth-actions";
import {
  openPayoutDashboardAction,
  startPayoutOnboardingAction,
} from "@/lib/actions/payout-actions";
import { AVATAR_COLORS } from "@/lib/avatar-colors";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { COMMON_TIMEZONES, formatMoney } from "@/lib/time";
import { initialsOf } from "@/lib/style-chips";

/** The mark shown next to a studio's name in listings. */
const STUDIO_BADGES = ["🎵", "🕺", "🔥", "✨", "👟", "🎧", "🌙", "🦋", "💃", "🩰"];

const card: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 24,
  padding: "32px clamp(22px, 4vw, 36px)",
  marginBottom: 16,
};

const heading: React.CSSProperties = {
  fontFamily: DISPLAY,
  fontWeight: 800,
  fontSize: 24,
  letterSpacing: "-0.02em",
  margin: 0,
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

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 18,
  marginBottom: 18,
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

const ghostBtn: React.CSSProperties = {
  ...primaryBtn,
  fontWeight: 600,
  padding: "13px 26px",
  background: "none",
  border: "1.5px solid oklch(89% 0.012 70)",
  color: "oklch(30% 0.02 60)",
};

const note: React.CSSProperties = { fontSize: 13.5, color: C.meta };

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

export function PayoutsCard({
  status,
  chargesEnabled,
  payoutsEnabled,
  netEarningsCents,
}: {
  status: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  netEarningsCents: number;
}) {
  const active = chargesEnabled && payoutsEnabled;

  return (
    <section
      style={{
        background: active ? C.card : C.nudgeBg,
        border: `1px solid ${active ? C.border : C.nudgeBorder}`,
        borderRadius: 24,
        padding: "30px clamp(22px, 4vw, 36px)",
        marginBottom: 16,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
      }}
    >
      <div style={{ flex: "1 1 380px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <h2 style={heading}>Payouts</h2>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              whiteSpace: "nowrap",
              padding: "4px 11px",
              borderRadius: 7,
              border: `1.2px solid ${active ? "oklch(80% 0.08 145)" : "oklch(80% 0.05 75)"}`,
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: active ? "oklch(45% 0.12 145)" : "oklch(45% 0.06 65)",
            }}
          >
            {active ? "Active" : status ? "Setup incomplete" : "Not set up"}
          </span>
        </div>
        <p
          style={{
            fontSize: 15,
            color: active ? C.inkBody : C.nudgeInk,
            margin: 0,
            maxWidth: 520,
          }}
        >
          {active
            ? `You have earned ${formatMoney(netEarningsCents)} after platform fees. Stripe pays out to your bank on its normal schedule.`
            : "Connect a Stripe account to charge for classes and get paid directly. Free classes work without this."}
        </p>
      </div>

      <form action={active ? openPayoutDashboardAction : startPayoutOnboardingAction}>
        <button type="submit" style={active ? ghostBtn : primaryBtn}>
          {active
            ? "Open Stripe dashboard"
            : status
              ? "Finish payout setup"
              : "Set up payouts"}
        </button>
      </form>
    </section>
  );
}

export function StudioDetailsCard({
  defaults,
}: {
  defaults: {
    name: string;
    description: string;
    city: string;
    address: string;
    timezone: string;
    emoji: string;
  };
}) {
  const [state, formAction] = useActionState(updateStudioAction, undefined);
  const [emoji, setEmoji] = useState(defaults.emoji);
  const zones = Array.from(new Set([defaults.timezone, ...COMMON_TIMEZONES]));
  const badges = Array.from(new Set([defaults.emoji, ...STUDIO_BADGES]));

  return (
    <section style={card}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <h2 style={heading}>Studio details</h2>
        <span style={{ fontSize: 13.5, color: C.label }}>
          This is what dancers see on Discover
        </span>
      </div>

      <form action={formAction}>
        <input type="hidden" name="emoji" value={emoji} />

        <div style={grid}>
          <div>
            <label style={labelStyle} htmlFor="studio-name">
              Studio name
            </label>
            <input id="studio-name" name="name" required defaultValue={defaults.name} style={field} />
          </div>
          <div>
            <label style={labelStyle} htmlFor="studio-city">
              City
            </label>
            <input id="studio-city" name="city" required defaultValue={defaults.city} style={field} />
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle} htmlFor="studio-description">
            Description
          </label>
          <textarea
            id="studio-description"
            name="description"
            required
            rows={3}
            defaultValue={defaults.description}
            style={{ ...field, resize: "vertical", lineHeight: 1.55 }}
          />
        </div>

        <div style={grid}>
          <div>
            <label style={labelStyle} htmlFor="studio-address">
              Address
            </label>
            <input
              id="studio-address"
              name="address"
              required
              defaultValue={defaults.address}
              style={field}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="studio-timezone">
              Timezone
            </label>
            <select
              id="studio-timezone"
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
            <p style={{ ...note, margin: "8px 0 0" }}>
              New classes use this for their local times.
            </p>
          </div>
        </div>

        <div style={{ marginBottom: 26 }}>
          <span id="badge-label" style={labelStyle}>
            Studio badge
          </span>
          <p style={{ fontSize: 13.5, color: C.label, margin: "0 0 12px" }}>
            One mark, shown next to your studio name in listings.
          </p>
          <div
            role="radiogroup"
            aria-labelledby="badge-label"
            style={{ display: "flex", flexWrap: "wrap", gap: 10 }}
          >
            {badges.map((glyph) => {
              const on = glyph === emoji;
              return (
                <button
                  key={glyph}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={`Studio badge ${glyph}`}
                  onClick={() => setEmoji(glyph)}
                  style={{
                    width: 46,
                    height: 46,
                    flex: "none",
                    borderRadius: 14,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    background: on ? C.nudgeBg : C.bg,
                    border: `1.5px solid ${on ? C.brand : "oklch(90% 0.012 70)"}`,
                  }}
                >
                  {glyph}
                </button>
              );
            })}
          </div>
        </div>

        <Notice error={state?.error} success={state?.success} />

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
          <button type="submit" style={primaryBtn}>
            Save studio
          </button>
          <span style={note}>Changes go live on Discover straight away.</span>
        </div>
      </form>
    </section>
  );
}

export function HostProfileCard({
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
    <section style={card}>
      <h2 style={{ ...heading, marginBottom: 24 }}>Edit profile</h2>
      <form action={formAction}>
        <input type="hidden" name="avatarColor" value={colour} />

        <div style={{ ...grid, marginBottom: 24 }}>
          <div>
            <label style={labelStyle} htmlFor="host-name">
              Name
            </label>
            <input
              id="host-name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={field}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="host-city">
              City
            </label>
            <input id="host-city" name="homeCity" defaultValue={defaults.homeCity} style={field} />
          </div>
          <div>
            <label style={labelStyle} htmlFor="host-timezone">
              Timezone
            </label>
            <select
              id="host-timezone"
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
          <span id="host-swatch-label" style={labelStyle}>
            Avatar colour
          </span>
          <p style={{ fontSize: 13.5, color: C.label, margin: "0 0 12px" }}>
            Your initials, in the colour you pick.
          </p>
          <div
            role="radiogroup"
            aria-labelledby="host-swatch-label"
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
          <span style={note}>Dancers see your name on every class you host.</span>
        </div>
      </form>
    </section>
  );
}

export function HostPasswordCard() {
  const [state, formAction] = useActionState(changePasswordAction, undefined);

  return (
    <section style={card}>
      <h2 style={{ ...heading, marginBottom: 24 }}>Change password</h2>
      <form action={formAction}>
        <div
          style={{
            ...grid,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            marginBottom: 24,
          }}
        >
          <div>
            <label style={labelStyle} htmlFor="host-pw-current">
              Current password
            </label>
            <input
              id="host-pw-current"
              name="current"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              style={field}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="host-pw-new">
              New password (min. 10 characters)
            </label>
            <input
              id="host-pw-new"
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
            <label style={labelStyle} htmlFor="host-pw-confirm">
              Confirm new password
            </label>
            <input
              id="host-pw-confirm"
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

        <button type="submit" style={ghostBtn}>
          Update password
        </button>
      </form>
    </section>
  );
}
