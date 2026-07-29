"use client";

import { useActionState } from "react";
import { claimAttendanceAction } from "@/lib/actions/class-actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

/**
 * Students claim attendance for an online class using the short code the host
 * reveals during the session — blind self-reporting would let anyone farm
 * points on classes they never joined.
 */
export function AttendButton({ bookingId }: { bookingId: string }) {
  const [state, formAction] = useActionState(claimAttendanceAction, undefined);

  if (state && "success" in state) {
    return (
      <div className="rounded-xl bg-success/10 p-3 text-sm text-success">
        <p className="font-semibold">+{state.points} points earned! 🎉</p>
        {state.newBadges.length > 0 && (
          <p className="mt-1">
            New badge{state.newBadges.length > 1 ? "s" : ""}:{" "}
            {state.newBadges.map((b) => `${b.emoji} ${b.name}`).join(", ")}
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-start gap-1.5">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="flex gap-2">
        <input
          name="code"
          required
          maxLength={6}
          autoComplete="off"
          placeholder="Class code"
          aria-label="Class check-in code"
          className="w-28 rounded-xl border border-border bg-surface px-3 py-2 text-center text-sm font-semibold uppercase tracking-widest outline-none focus:border-brand"
        />
        <SubmitButton variant="secondary" size="sm" pendingLabel="Checking…">
          Check in
        </SubmitButton>
      </div>
      {state?.error && (
        <p className="text-xs text-red-600" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
