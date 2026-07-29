"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/lib/actions/auth-actions";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/ui/SubmitButton";

const inputClass =
  "rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-brand";

export function PasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, undefined);

  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="font-bold text-ink">Change password</h2>
      <form action={formAction} className="flex flex-col gap-3">
        <input
          name="current"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Current password"
          className={inputClass}
        />
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
        {state?.success && (
          <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            {state.success}
          </p>
        )}

        <SubmitButton size="sm" variant="secondary" pendingLabel="Updating…">
          Update password
        </SubmitButton>
      </form>
    </Card>
  );
}
