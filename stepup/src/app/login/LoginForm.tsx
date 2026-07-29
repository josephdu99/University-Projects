"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-3">
      <input
        name="email"
        type="email"
        required
        placeholder="Email"
        autoComplete="email"
        className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-brand"
      />
      <input
        name="password"
        type="password"
        required
        placeholder="Password"
        autoComplete="current-password"
        className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-brand"
      />
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? "Logging in…" : "Log in"}
      </Button>
      <Link
        href="/forgot-password"
        className="text-center text-sm text-ink-soft hover:text-ink"
      >
        Forgot your password?
      </Link>
    </form>
  );
}
