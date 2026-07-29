"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { clsx } from "clsx";
import { signUpAction } from "@/lib/actions/auth-actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { COMMON_TIMEZONES, DEFAULT_TIMEZONE } from "@/lib/time";
import type { SignupRole } from "@/lib/roles";

const ROLE_OPTIONS: {
  role: SignupRole;
  emoji: string;
  title: string;
  subtitle: string;
}[] = [
  {
    role: "STUDENT",
    emoji: "💃",
    title: "Take classes",
    subtitle: "Book in-person & online classes",
  },
  {
    role: "STUDIO_OWNER",
    emoji: "🏢",
    title: "Run a studio",
    subtitle: "Host classes at your venue",
  },
  {
    role: "INSTRUCTOR",
    emoji: "🎥",
    title: "Teach online",
    subtitle: "Independent instructor, no studio",
  },
];

const inputClass =
  "rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-brand";

export function SignUpForm() {
  const [role, setRole] = useState<SignupRole>("STUDENT");
  // Default to the browser's own zone so most people never touch the picker.
  // Computed lazily as initial state rather than in an effect, which would
  // render once with the wrong value and then immediately re-render.
  const [timezone, setTimezone] = useState<string>(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE
  );
  const [state, formAction] = useActionState(signUpAction, undefined);

  const zoneOptions = Array.from(
    new Set([timezone, ...COMMON_TIMEZONES])
  ).filter(Boolean);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {ROLE_OPTIONS.map((opt) => (
          <label
            key={opt.role}
            className={clsx(
              "flex cursor-pointer flex-col items-center gap-1 rounded-2xl border p-3 text-center transition-colors",
              role === opt.role
                ? "border-brand bg-brand-light"
                : "border-border hover:border-ink-soft"
            )}
          >
            <input
              type="radio"
              name="role"
              value={opt.role}
              checked={role === opt.role}
              onChange={() => setRole(opt.role)}
              className="sr-only"
            />
            <span className="text-2xl">{opt.emoji}</span>
            <span className="text-xs font-semibold text-ink">{opt.title}</span>
            <span className="text-[11px] leading-tight text-ink-soft">
              {opt.subtitle}
            </span>
          </label>
        ))}
      </div>

      <input name="name" required placeholder="Full name" className={inputClass} />
      <input
        name="email"
        type="email"
        required
        placeholder="Email"
        autoComplete="email"
        className={inputClass}
      />
      <input
        name="password"
        type="password"
        required
        minLength={10}
        placeholder="Password (min. 10 characters)"
        autoComplete="new-password"
        className={inputClass}
      />

      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Your timezone
        <select
          name="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className={inputClass}
        >
          {zoneOptions.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </label>

      {role !== "STUDIO_OWNER" && (
        <input name="homeCity" placeholder="City (optional)" className={inputClass} />
      )}

      {role === "INSTRUCTOR" && (
        <textarea
          name="bio"
          placeholder="Short bio — what do you teach? (optional)"
          rows={2}
          className={inputClass}
        />
      )}

      {role === "STUDIO_OWNER" && (
        <div className="flex flex-col gap-3 rounded-2xl bg-surface-muted p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Your studio
          </p>
          <input name="studioName" required placeholder="Studio name" className={inputClass} />
          <input name="studioCity" required placeholder="City" className={inputClass} />
          <input name="studioAddress" required placeholder="Address" className={inputClass} />
          <textarea
            name="studioDescription"
            placeholder="Short description (optional)"
            rows={2}
            className={inputClass}
          />
        </div>
      )}

      <label className="flex items-start gap-2.5 text-xs text-ink-soft">
        <input
          type="checkbox"
          name="acceptTerms"
          required
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--color-brand)]"
        />
        <span>
          I agree to the{" "}
          <Link href="/legal/terms" className="font-semibold text-brand underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="font-semibold text-brand underline">
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton size="lg" className="w-full" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
