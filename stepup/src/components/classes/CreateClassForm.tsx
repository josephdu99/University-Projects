"use client";

import { useActionState, useState } from "react";
import { createClassAction } from "@/lib/actions/class-actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { DANCE_LEVELS, LEVEL_LABEL } from "@/lib/roles";

const inputClass =
  "rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-brand";

/** Everything "Run again" carries over from a past class. Date stays blank. */
export type ClassDefaults = {
  title: string;
  style: string;
  level: string;
  description: string;
  format: "IN_PERSON" | "ONLINE";
  location: string;
  onlineLink: string;
  durationMin: number;
  capacity: number;
  points: number;
  priceDollars: number;
};

export function CreateClassForm({
  fixedFormat,
  timezone,
  canCharge,
  defaults,
}: {
  fixedFormat?: "ONLINE";
  timezone: string;
  canCharge: boolean;
  defaults?: ClassDefaults;
}) {
  const [state, formAction] = useActionState(createClassAction, undefined);
  const [format, setFormat] = useState<"IN_PERSON" | "ONLINE">(
    fixedFormat ?? defaults?.format ?? "IN_PERSON"
  );
  const [repeats, setRepeats] = useState(false);

  return (
      <form action={formAction} className="flex flex-col gap-3">
        <input
          name="title"
          required
          placeholder="Class title"
          defaultValue={defaults?.title}
          className={inputClass}
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            name="style"
            required
            placeholder="Style (e.g. Salsa)"
            defaultValue={defaults?.style}
            className={inputClass}
          />
          <select
            name="level"
            defaultValue={defaults?.level ?? "ALL_LEVELS"}
            className={inputClass}
          >
            {DANCE_LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABEL[l]}
              </option>
            ))}
          </select>
        </div>

        <textarea
          name="description"
          required
          rows={2}
          placeholder="Short description"
          defaultValue={defaults?.description}
          className={inputClass}
        />

        {!fixedFormat && (
          <div className="flex gap-2">
            {(["IN_PERSON", "ONLINE"] as const).map((f) => (
              <label
                key={f}
                className={`flex-1 cursor-pointer rounded-xl border px-3 py-2 text-center text-sm font-medium ${
                  format === f
                    ? "border-brand bg-brand-light text-brand-dark"
                    : "border-border text-ink-soft"
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={f}
                  checked={format === f}
                  onChange={() => setFormat(f)}
                  className="sr-only"
                />
                {f === "IN_PERSON" ? "In person" : "Online"}
              </label>
            ))}
          </div>
        )}
        {fixedFormat && <input type="hidden" name="format" value={fixedFormat} />}

        {format === "IN_PERSON" ? (
          <input
            name="location"
            placeholder="Location (optional — defaults to studio address)"
            defaultValue={defaults?.location}
            className={inputClass}
          />
        ) : (
          <input
            name="onlineLink"
            required
            placeholder="Online meeting link"
            defaultValue={defaults?.onlineLink}
            className={inputClass}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Date
            <input name="date" type="date" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Start time
            <input name="time" type="time" required className={inputClass} />
          </label>
        </div>

        <input type="hidden" name="timezone" value={timezone} />
        <p className="-mt-1 text-xs text-ink-soft">
          Times are in <strong>{timezone.replace(/_/g, " ")}</strong>.
        </p>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="repeatWeekly"
            checked={repeats}
            onChange={(e) => setRepeats(e.target.checked)}
            className="h-4 w-4 accent-[color:var(--color-brand)]"
          />
          Repeat weekly
        </label>

        {repeats && (
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            How many weeks?
            <input
              name="repeatWeeks"
              type="number"
              defaultValue={8}
              min={2}
              max={52}
              className={inputClass}
            />
          </label>
        )}

        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Duration (min)
            <input
              name="durationMin"
              type="number"
              defaultValue={defaults?.durationMin ?? 60}
              min={15}
              max={240}
              required
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Capacity
            <input
              name="capacity"
              type="number"
              defaultValue={defaults?.capacity ?? 20}
              min={1}
              max={500}
              required
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Points
            <input
              name="points"
              type="number"
              defaultValue={defaults?.points ?? 25}
              min={5}
              max={200}
              required
              className={inputClass}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Price (AUD) — leave 0 for a free class
          <input
            name="priceDollars"
            type="number"
            defaultValue={defaults?.priceDollars ?? 0}
            min={0}
            max={1000}
            step="0.01"
            disabled={!canCharge}
            className={inputClass}
          />
          {!canCharge && (
            <span className="text-[11px]">
              Set up payouts to charge for classes.
            </span>
          )}
        </label>

        {state && "error" in state && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}
        {state && "success" in state && (
          <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            {state.created > 1
              ? `${state.created} classes published! 🎉`
              : "Class published! It's now visible to dancers. 🎉"}
          </p>
        )}

        <SubmitButton className="w-full" pendingLabel="Publishing…">
          Publish class
        </SubmitButton>
      </form>
  );
}
