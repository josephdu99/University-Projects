"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { signUpAction } from "@/lib/actions/auth-actions";
import { C, DISPLAY, CARD_SHADOW } from "@/lib/marketing-theme";
import type { SignupRole } from "@/lib/roles";

/** Design's intent ids, mapped onto the app's account roles. */
type Intent = "find" | "inPerson" | "online";

const ROLE_BY_INTENT: Record<Intent, SignupRole> = {
  find: "STUDENT",
  inPerson: "STUDIO_OWNER",
  online: "INSTRUCTOR",
};

const COPY: Record<
  Intent,
  {
    cardTitle: string;
    cardDesc: string;
    headline: string;
    subhead: string;
    benefits: string[];
    submitLabel: string;
    orgFieldLabel?: string;
    orgFieldPlaceholder?: string;
  }
> = {
  find: {
    cardTitle: "Find a class",
    cardDesc: "Book classes, earn points, and track streaks as a dancer.",
    headline: "Set up your dancer profile.",
    subhead:
      "Book classes, earn points, and keep your streak alive — free forever for dancers.",
    benefits: [
      "Unlimited class browsing & one-tap booking",
      // The leaderboard ranks attendance, not points, resets monthly, and you
      // are only on it if you opt in — so the benefit says exactly that.
      "An opt-in monthly leaderboard for your city",
      // The comp said "friend challenges". There is no friends feature, so
      // this describes the streak instead.
      "Streaks that reward showing up",
      "Free forever — no credit card required",
    ],
    submitLabel: "Create free account",
  },
  inPerson: {
    cardTitle: "List an in-person class",
    cardDesc: "Run a studio? List your schedule and fill more spots.",
    headline: "Set up your studio profile.",
    subhead:
      "List your schedule, fill more spots, and reach dancers nearby.",
    benefits: [
      "List unlimited classes & locations",
      "Manage bookings & waitlists automatically",
      "Get discovered by nearby dancers",
      "Free to list — pay only when you get bookings",
    ],
    submitLabel: "Create studio account",
    orgFieldLabel: "Studio name",
    orgFieldPlaceholder: "Bloom Studio",
  },
  online: {
    cardTitle: "Set up online classes",
    cardDesc:
      "Teach remotely? Set your availability and reach dancers anywhere.",
    headline: "Set up your online teaching profile.",
    subhead: "Set your availability and reach dancers anywhere.",
    benefits: [
      "Host live sessions from anywhere",
      "Set your own schedule & pricing",
      "Reach dancers outside your city",
      "Free to start — no setup fees",
    ],
    submitLabel: "Create instructor account",
    orgFieldLabel: "Business / instructor name",
    orgFieldPlaceholder: "Maya R. Dance",
  },
};

const ICONS: Record<Intent, React.ReactNode> = {
  find: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M20 20l-4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  inPerson: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4"
        y="3"
        width="16"
        height="18"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 8h1M15 8h1M8 12h1M15 12h1M8 16h1M15 16h1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  online: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="4"
        width="18"
        height="13"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 21h8M12 17v4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
};

const INTENTS: Intent[] = ["find", "inPerson", "online"];

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "13px 16px",
  borderRadius: 12,
  border: `1px solid ${C.borderInput}`,
  fontSize: 15,
  fontFamily: "inherit",
  marginBottom: 18,
  background: C.card,
  color: C.ink,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "oklch(40% 0.02 60)",
  marginBottom: 6,
};

const eyebrowStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 14px",
  borderRadius: 999,
  background: C.tagBg,
  color: C.tagInk,
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: "0.02em",
  marginBottom: 20,
};

export function GetStartedFlow() {
  const [step, setStep] = useState<1 | 2>(1);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [state, formAction] = useActionState(signUpAction, undefined);

  // The browser knows the visitor's zone, so scheduling works correctly
  // without asking them for it during signup.
  const [timezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Australia/Sydney"
  );

  const copy = intent ? COPY[intent] : COPY.find;
  const isOrg = intent === "inPerson" || intent === "online";

  return (
    <div
      style={{
        background: C.bg,
        color: C.ink,
        lineHeight: 1.5,
        minHeight: "100vh",
      }}
    >
      {/* NAV */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          padding: "20px clamp(20px, 5vw, 48px)",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: "-0.02em",
            color: C.ink,
            textDecoration: "none",
          }}
        >
          StepUp
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{ display: "flex", alignItems: "center", gap: 8 }}
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={2}
            aria-label={`Step ${step} of 2`}
          >
            <Dot active />
            <Dot active={step === 2} />
          </div>
          <div style={{ fontSize: 14, color: C.inkSoft }}>
            Already have an account?{" "}
            <Link
              href="/login"
              style={{ fontWeight: 700, color: C.brand, textDecoration: "none" }}
            >
              Log in
            </Link>
          </div>
        </div>
      </div>

      {/* STEP 1 — INTENT */}
      {step === 1 && (
        <div
          style={{
            maxWidth: 880,
            margin: "0 auto",
            padding: "clamp(44px, 7vw, 80px) clamp(20px, 5vw, 48px) 96px",
            textAlign: "center",
          }}
        >
          <div style={eyebrowStyle}>STEP 1 OF 2</div>
          <h1
            style={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: "clamp(28px, 5vw, 38px)",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              margin: "0 0 14px",
            }}
          >
            What are you here to do?
          </h1>
          <p
            style={{
              fontSize: 16,
              color: C.inkSoft,
              margin: "0 0 48px",
            }}
          >
            You can always add more later — this just sets up your account
            right.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 18,
              textAlign: "left",
            }}
          >
            {INTENTS.map((id) => {
              const active = intent === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setIntent(id)}
                  aria-pressed={active}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    padding: "26px 22px",
                    borderRadius: 20,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                    border: active
                      ? `1.5px solid ${C.brand}`
                      : `1.5px solid ${C.border}`,
                    background: active ? "oklch(66% 0.19 35 / 0.06)" : C.card,
                    boxShadow: active
                      ? "0 2px 12px oklch(66% 0.19 35 / 0.16)"
                      : "none",
                    transition: "box-shadow 0.12s ease",
                  }}
                >
                  <span
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 999,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      alignSelf: "center",
                      background: active ? C.brand : "oklch(94% 0.01 70)",
                      color: active ? C.onBrand : "oklch(40% 0.02 60)",
                    }}
                  >
                    {ICONS[id]}
                  </span>
                  <div
                    style={{
                      fontFamily: DISPLAY,
                      fontWeight: 700,
                      fontSize: 17,
                      marginTop: 14,
                    }}
                  >
                    {COPY[id].cardTitle}
                  </div>
                  <div
                    style={{
                      fontSize: 13.5,
                      color: C.inkSoft,
                      marginTop: 6,
                    }}
                  >
                    {COPY[id].cardDesc}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => intent && setStep(2)}
            disabled={!intent}
            style={{
              marginTop: 40,
              padding: "15px 40px",
              border: "none",
              borderRadius: 999,
              background: intent ? C.brand : C.disabledBg,
              color: intent ? C.onBrand : C.disabledInk,
              fontWeight: 700,
              fontSize: 16,
              fontFamily: "inherit",
              cursor: intent ? "pointer" : "not-allowed",
            }}
          >
            Continue
          </button>
        </div>
      )}

      {/* STEP 2 — PROFILE */}
      {step === 2 && intent && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 56,
            maxWidth: 1180,
            margin: "0 auto",
            padding: "clamp(32px, 5vw, 56px) clamp(20px, 5vw, 48px) 96px",
            alignItems: "flex-start",
          }}
        >
          <div style={{ flex: "1 1 420px", minWidth: 280 }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                padding: 0,
                marginBottom: 20,
                fontFamily: "inherit",
                fontWeight: 600,
                fontSize: 14,
                color: C.inkSoft,
                cursor: "pointer",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back
            </button>

            <div style={eyebrowStyle}>STEP 2 OF 2</div>
            <h1
              style={{
                fontFamily: DISPLAY,
                fontWeight: 800,
                fontSize: "clamp(28px, 5vw, 38px)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                margin: "0 0 20px",
              }}
            >
              {copy.headline}
            </h1>
            <p
              style={{
                fontSize: 16,
                color: C.inkSoft,
                maxWidth: 440,
                margin: "0 0 36px",
              }}
            >
              {copy.subhead}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {copy.benefits.map((b) => (
                <div
                  key={b}
                  style={{ display: "flex", gap: 14, alignItems: "flex-start" }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      background: "oklch(66% 0.19 35 / 0.15)",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: C.brand,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      color: C.inkBody,
                      paddingTop: 3,
                    }}
                  >
                    {b}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form
            action={formAction}
            style={{
              flex: "1 1 400px",
              minWidth: 280,
              maxWidth: 440,
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 28,
              padding: "clamp(26px, 4vw, 40px)",
              boxShadow: CARD_SHADOW,
            }}
          >
            {/* Derived from the step 1 choice rather than asked again. */}
            <input type="hidden" name="role" value={ROLE_BY_INTENT[intent]} />
            <input type="hidden" name="timezone" value={timezone} />

            <label style={labelStyle} htmlFor="su-name">
              Full name
            </label>
            <input
              id="su-name"
              name="name"
              required
              autoComplete="name"
              placeholder="Jordan Perez"
              style={inputStyle}
            />

            {isOrg && (
              <>
                <label style={labelStyle} htmlFor="su-org">
                  {copy.orgFieldLabel}
                </label>
                <input
                  id="su-org"
                  name="studioName"
                  required
                  placeholder={copy.orgFieldPlaceholder}
                  style={inputStyle}
                />
              </>
            )}

            {/* A studio's city and street address are needed so classes can
                show a location and appear in city filters. */}
            {intent === "inPerson" && (
              <>
                <label style={labelStyle} htmlFor="su-city">
                  City
                </label>
                <input
                  id="su-city"
                  name="studioCity"
                  required
                  autoComplete="address-level2"
                  placeholder="Sydney"
                  style={inputStyle}
                />

                <label style={labelStyle} htmlFor="su-address">
                  Studio address
                </label>
                <input
                  id="su-address"
                  name="studioAddress"
                  required
                  autoComplete="street-address"
                  placeholder="12 Beat St, Surry Hills"
                  style={inputStyle}
                />
              </>
            )}

            <label style={labelStyle} htmlFor="su-email">
              Email
            </label>
            <input
              id="su-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              style={inputStyle}
            />

            <label style={labelStyle} htmlFor="su-password">
              Password
            </label>
            <input
              id="su-password"
              name="password"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              placeholder="At least 10 characters"
              style={{ ...inputStyle, marginBottom: 26 }}
            />

            {state?.error && (
              <p
                role="alert"
                style={{
                  background: "oklch(95% 0.05 25)",
                  color: "oklch(45% 0.16 25)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 14,
                  margin: "0 0 18px",
                }}
              >
                {state.error}
              </p>
            )}

            <SubmitButton label={copy.submitLabel} />

            <div
              style={{
                fontSize: 12.5,
                color: "oklch(50% 0.02 60)",
                textAlign: "center",
                marginTop: 16,
              }}
            >
              By continuing you agree to StepUp&apos;s{" "}
              <Link href="/legal/terms" style={{ color: C.brand }}>
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/legal/privacy" style={{ color: C.brand }}>
                Privacy Policy
              </Link>
              .
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Dot({ active }: { active?: boolean }) {
  return (
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        background: active ? C.brand : C.borderSoft,
      }}
    />
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        width: "100%",
        padding: 15,
        border: "none",
        borderRadius: 999,
        background: pending ? C.disabledBg : C.brand,
        color: pending ? C.disabledInk : C.onBrand,
        fontWeight: 700,
        fontSize: 16,
        fontFamily: "inherit",
        cursor: pending ? "not-allowed" : "pointer",
      }}
    >
      {pending ? "Creating your account…" : label}
    </button>
  );
}
