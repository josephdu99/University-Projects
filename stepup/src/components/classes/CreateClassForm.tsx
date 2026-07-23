"use client";

import { useActionState, useState } from "react";
import { createClassAction } from "@/lib/actions/class-actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { DANCE_LEVELS, LEVEL_LABEL } from "@/lib/roles";

const inputClass =
  "rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-brand";

export function CreateClassForm({ fixedFormat }: { fixedFormat?: "ONLINE" }) {
  const [state, formAction] = useActionState(createClassAction, undefined);
  const [format, setFormat] = useState<"IN_PERSON" | "ONLINE">(fixedFormat ?? "IN_PERSON");

  return (
    <details className="group rounded-2xl border border-border bg-surface open:pb-4">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 font-semibold text-ink">
        <span>+ Create a class</span>
        <span className="text-ink-soft transition-transform group-open:rotate-180">⌄</span>
      </summary>

      <form action={formAction} className="flex flex-col gap-3 px-4">
        <input name="title" required placeholder="Class title" className={inputClass} />
        <div className="grid grid-cols-2 gap-3">
          <input name="style" required placeholder="Style (e.g. Salsa)" className={inputClass} />
          <select name="level" defaultValue="ALL_LEVELS" className={inputClass}>
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
          className={inputClass}
        />

        {!fixedFormat && (
          <div className="flex gap-2">
            {(["IN_PERSON", "ONLINE"] as const).map((f) => (
              <label
                key={f}
                className={`flex-1 cursor-pointer rounded-xl border px-3 py-2 text-center text-sm font-medium ${
                  format === f ? "border-brand bg-brand-light text-brand-dark" : "border-border text-ink-soft"
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

        {format === "IN_PERSON" && !fixedFormat ? (
          <input name="location" placeholder="Location (optional — defaults to studio address)" className={inputClass} />
        ) : (
          <input name="onlineLink" placeholder="Online meeting link" className={inputClass} />
        )}

        <div className="grid grid-cols-2 gap-3">
          <input name="date" type="date" required className={inputClass} />
          <input name="time" type="time" required className={inputClass} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Duration (min)
            <input name="durationMin" type="number" defaultValue={60} min={15} max={240} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Capacity
            <input name="capacity" type="number" defaultValue={20} min={1} max={500} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Points
            <input name="points" type="number" defaultValue={25} min={5} max={200} required className={inputClass} />
          </label>
        </div>

        {state && "error" in state && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
        )}
        {state && "success" in state && (
          <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            Class published! It&apos;s now visible to dancers. 🎉
          </p>
        )}

        <SubmitButton className="w-full" pendingLabel="Publishing…">
          Publish class
        </SubmitButton>
      </form>
    </details>
  );
}
