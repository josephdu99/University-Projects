"use client";

import { useActionState } from "react";
import { bookClassAction } from "@/lib/actions/class-actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function BookButton({
  classId,
  isFull,
  size = "md",
  label = "Book",
}: {
  classId: string;
  isFull: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const [state, formAction] = useActionState(bookClassAction, undefined);

  if (state && "success" in state) {
    return state.status === "WAITLISTED" ? (
      <div className="rounded-full bg-gold/15 py-2.5 text-center text-sm font-semibold text-gold">
        On the waitlist{state.position ? ` · #${state.position}` : ""}
      </div>
    ) : (
      <div className="rounded-full bg-success/10 py-2.5 text-center text-sm font-semibold text-success">
        Booked ✓
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="classId" value={classId} />
      {state?.error && (
        <p className="text-xs text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton size={size} className="w-full" pendingLabel="Booking…">
        {isFull ? "Join waitlist" : label}
      </SubmitButton>
    </form>
  );
}
