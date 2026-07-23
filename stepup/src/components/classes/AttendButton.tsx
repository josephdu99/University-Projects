"use client";

import { useActionState } from "react";
import { selfReportAttendanceAction } from "@/lib/actions/class-actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function AttendButton({ bookingId }: { bookingId: string }) {
  const [state, formAction] = useActionState(selfReportAttendanceAction, undefined);

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
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="bookingId" value={bookingId} />
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <SubmitButton variant="secondary" size="sm" pendingLabel="Marking…">
        I danced! Mark attended
      </SubmitButton>
    </form>
  );
}
