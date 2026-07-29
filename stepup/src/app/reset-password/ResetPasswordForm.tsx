"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction } from "@/lib/actions/auth-actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

const inputClass =
  "rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-brand";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, undefined);

  if (state?.success) {
    return (
      <div className="mt-6 flex flex-col items-center gap-4">
        <p className="rounded-2xl bg-success/10 p-4 text-center text-sm text-success">
          {state.success}
        </p>
        <Link href="/login" className="font-semibold text-brand">
          Go to log in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <input
        name="password"
        type="password"
        required
        minLength={10}
        autoComplete="new-password"
        placeholder="New password (min. 10 characters)"
        className={inputClass}
      />
      <input
        name="confirm"
        type="password"
        required
        autoComplete="new-password"
        placeholder="Confirm new password"
        className={inputClass}
      />
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton size="lg" className="w-full" pendingLabel="Updating…">
        Update password
      </SubmitButton>
    </form>
  );
}
