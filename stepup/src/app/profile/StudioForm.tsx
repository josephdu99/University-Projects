"use client";

import { useActionState } from "react";
import { updateStudioAction } from "@/lib/actions/auth-actions";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { COMMON_TIMEZONES } from "@/lib/time";

const inputClass =
  "rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-brand";

export function StudioForm({
  defaults,
}: {
  defaults: {
    name: string;
    description: string;
    city: string;
    address: string;
    timezone: string;
    emoji: string;
  };
}) {
  const [state, formAction] = useActionState(updateStudioAction, undefined);
  const zones = Array.from(new Set([defaults.timezone, ...COMMON_TIMEZONES]));

  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="font-bold text-ink">Studio details</h2>
      <form action={formAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Studio name
          <input name="name" required defaultValue={defaults.name} className={inputClass} />
        </label>

        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Description
          <textarea
            name="description"
            required
            rows={2}
            defaultValue={defaults.description}
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            City
            <input name="city" required defaultValue={defaults.city} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Emoji
            <input
              name="emoji"
              required
              maxLength={8}
              defaultValue={defaults.emoji}
              className={inputClass}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Address
          <input
            name="address"
            required
            defaultValue={defaults.address}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Timezone — new classes use this for their local times
          <select name="timezone" defaultValue={defaults.timezone} className={inputClass}>
            {zones.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>

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

        <SubmitButton size="sm" pendingLabel="Saving…">
          Save studio
        </SubmitButton>
      </form>
    </Card>
  );
}
