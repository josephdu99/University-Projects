"use client";

import { useActionState } from "react";
import { requestPasswordResetAction } from "@/lib/actions/auth-actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, undefined);

  if (state?.success) {
    return (
      <div className="mt-6 rounded-2xl bg-success/10 p-4 text-center text-sm text-success">
        {state.success}
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-3">
      <input
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="Email"
        className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-brand"
      />
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton size="lg" className="w-full" pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
