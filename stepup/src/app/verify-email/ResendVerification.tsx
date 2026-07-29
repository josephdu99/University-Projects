"use client";

import { useActionState } from "react";
import { resendVerificationAction } from "@/lib/actions/auth-actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function ResendVerification() {
  const [state, formAction] = useActionState(
    async () => resendVerificationAction(),
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col items-center gap-2">
      {state?.success && (
        <p className="text-sm font-medium text-success">{state.success}</p>
      )}
      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton variant="secondary" pendingLabel="Sending…">
        Resend confirmation email
      </SubmitButton>
    </form>
  );
}
