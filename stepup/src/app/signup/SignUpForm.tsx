"use client";

import { useActionState, useState } from "react";
import { clsx } from "clsx";
import { signUpAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/Button";
import type { Role } from "@/lib/roles";

const ROLE_OPTIONS: { role: Role; emoji: string; title: string; subtitle: string }[] = [
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
  const [role, setRole] = useState<Role>("STUDENT");
  const [state, formAction, pending] = useActionState(signUpAction, undefined);

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
        minLength={8}
        placeholder="Password (min. 8 characters)"
        autoComplete="new-password"
        className={inputClass}
      />

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
          <input
            name="studioName"
            required
            placeholder="Studio name"
            className={inputClass}
          />
          <input
            name="studioCity"
            required
            placeholder="City"
            className={inputClass}
          />
          <input
            name="studioAddress"
            required
            placeholder="Address"
            className={inputClass}
          />
          <textarea
            name="studioDescription"
            placeholder="Short description (optional)"
            rows={2}
            className={inputClass}
          />
        </div>
      )}

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
