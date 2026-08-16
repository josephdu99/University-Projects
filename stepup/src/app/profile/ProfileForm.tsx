"use client";

import { useActionState } from "react";
import { useSession } from "next-auth/react";
import { updateProfileAction } from "@/lib/actions/auth-actions";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { COMMON_TIMEZONES } from "@/lib/time";

const inputClass =
  "rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-brand";

const EMOJI_CHOICES = ["🕺", "💃", "⚡", "🌟", "🔥", "🎀", "🌊", "🎤", "🩰", "🚀"];
const COLOR_CHOICES = [
  "#FC5200",
  "#7C5CFC",
  "#12B886",
  "#F59F00",
  "#E64980",
  "#1E90FF",
];

export function ProfileForm({
  defaults,
  showBio,
}: {
  defaults: {
    name: string;
    displayName: string;
    homeCity: string;
    bio: string;
    timezone: string;
    avatarEmoji: string;
    avatarColor: string;
  };
  showBio: boolean;
}) {
  const { update } = useSession();
  const [state, formAction] = useActionState(
    async (prev: Awaited<ReturnType<typeof updateProfileAction>>, fd: FormData) => {
      const result = await updateProfileAction(prev, fd);
      // Refresh the JWT so the nav avatar and name update immediately.
      if (result?.success) await update();
      return result;
    },
    undefined
  );

  const zones = Array.from(new Set([defaults.timezone, ...COMMON_TIMEZONES]));

  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="font-bold text-ink">Edit profile</h2>
      <form action={formAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Name
          <input
            name="name"
            required
            defaultValue={defaults.name}
            className={inputClass}
          />
        </label>

        {showBio && (
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Display name — what dancers see on your classes
            <input
              name="displayName"
              defaultValue={defaults.displayName}
              placeholder="e.g. Maya R. Dance"
              className={inputClass}
            />
          </label>
        )}

        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          City
          <input
            name="homeCity"
            defaultValue={defaults.homeCity}
            className={inputClass}
          />
        </label>

        {showBio && (
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Bio
            <textarea
              name="bio"
              rows={2}
              defaultValue={defaults.bio}
              className={inputClass}
            />
          </label>
        )}

        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Timezone
          <select
            name="timezone"
            defaultValue={defaults.timezone}
            className={inputClass}
          >
            {zones.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-xs text-ink-soft">Avatar</legend>
          <div className="flex flex-wrap gap-1.5">
            {EMOJI_CHOICES.map((e) => (
              <label key={e} className="cursor-pointer">
                <input
                  type="radio"
                  name="avatarEmoji"
                  value={e}
                  defaultChecked={e === defaults.avatarEmoji}
                  className="peer sr-only"
                />
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-lg peer-checked:border-brand peer-checked:bg-brand-light">
                  {e}
                </span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_CHOICES.map((c) => (
              <label key={c} className="cursor-pointer">
                <input
                  type="radio"
                  name="avatarColor"
                  value={c}
                  defaultChecked={c === defaults.avatarColor}
                  className="peer sr-only"
                />
                <span
                  className="block h-7 w-7 rounded-full border-2 border-transparent peer-checked:border-ink"
                  style={{ backgroundColor: c }}
                />
              </label>
            ))}
          </div>
        </fieldset>

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
          Save changes
        </SubmitButton>
      </form>
    </Card>
  );
}
