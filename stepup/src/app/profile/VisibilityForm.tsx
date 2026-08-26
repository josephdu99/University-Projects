"use client";

import { useActionState } from "react";
import { updateLeaderboardVisibilityAction } from "@/lib/actions/auth-actions";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/ui/SubmitButton";

/**
 * The leaderboard opt-in, and the target of the board's "Hide me from boards"
 * link. Off by default — a dancer is never on a public board until they put
 * themselves there.
 */
export function VisibilityForm({ optedIn }: { optedIn: boolean }) {
  const [state, formAction] = useActionState(
    updateLeaderboardVisibilityAction,
    undefined
  );

  return (
    <Card className="flex flex-col gap-3 p-5" id="visibility">
      <h2 className="font-bold text-ink">Leaderboard visibility</h2>
      <p className="text-sm text-ink-soft">
        {optedIn
          ? "Your name, initials, city and class count appear on the monthly leaderboard for other dancers. Studios can't see it."
          : "You're not on the leaderboard. Nobody but you can see your row."}
      </p>

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

      <form action={formAction}>
        <input type="hidden" name="optIn" value={optedIn ? "false" : "true"} />
        <SubmitButton size="sm" variant="secondary" pendingLabel="Saving…">
          {optedIn ? "Hide me from boards" : "Show me on boards"}
        </SubmitButton>
      </form>
    </Card>
  );
}
