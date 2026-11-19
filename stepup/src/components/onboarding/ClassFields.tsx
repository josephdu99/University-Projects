"use client";

import { DISPLAY } from "@/lib/marketing-theme";
import { findSuburb } from "@/lib/suburbs";
import {
  DAYS,
  HORIZON_WEEKS,
  LENGTHS,
  LIMITS,
  MUSIC_OPTIONS,
  PARTNER,
  REPEATS,
  type ClassDraft,
} from "@/lib/class-form";
import { SuburbCombobox } from "@/components/first-class/SuburbCombobox";
import { CARD, Chip, Field, Grid, Group, hintStyle } from "./fields";

export type TeacherOption = { id: string; label: string; name: string };

/**
 * The First Timer class fields. The parent owns the draft; this only draws
 * it. `mode` decides the two differences: a studio picks a teacher and a
 * room at its own address, an independent teacher says where the class is.
 */
export function ClassFields({
  draft,
  set,
  mode,
  styles,
  teachers = [],
  canCharge,
  venueLine,
  promises,
  tried,
  accent,
  legendSize = 20,
}: {
  draft: ClassDraft;
  set: (patch: Partial<ClassDraft>) => void;
  mode: "studio" | "independent";
  styles: readonly string[];
  teachers?: TeacherOption[];
  /** Whether paid classes are possible yet (payouts connected). */
  canCharge: boolean;
  /** Studio classes happen at the studio: "At 12 Beat St, Surry Hills." */
  venueLine?: string;
  promises: readonly string[];
  tried: boolean;
  accent?: string;
  legendSize?: number;
}) {
  const suburb = findSuburb(draft.suburb);
  const text = (k: keyof ClassDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    set({ [k]: e.target.value } as Partial<ClassDraft>);

  return (
    <>
      <Group legend="The class" size={legendSize}>
        <Grid min={210} gap={12}>
          <Field label="Class name">
            <input className="su-fld" value={draft.title} maxLength={LIMITS.title} onChange={text("title")} placeholder="Salsa Foundations" />
          </Field>
          {mode === "studio" && (
            <Field label="Teacher">
              <select className="su-fld" value={draft.teacher} onChange={text("teacher")}>
                <option value="">Choose a teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Style">
            <select className="su-fld" value={draft.style} onChange={text("style")}>
              <option value="">Choose a style</option>
              {styles.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Music it's danced to">
            <select className="su-fld" value={draft.music} onChange={text("music")}>
              <option value="">Choose</option>
              {MUSIC_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
        </Grid>
        {mode === "studio" && (
          <div style={hintStyle}>
            {teachers.length
              ? "Teachers whose invite is pending can be assigned now. They see the class once they join."
              : "Invite a teacher first, or tick “I teach classes here too” under Your teachers."}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }} id="partner-label">
            Partner work
          </span>
          <div role="group" aria-labelledby="partner-label" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {PARTNER.map((p) => (
              <Chip key={p.id} on={draft.partner === p.id} onClick={() => set({ partner: p.id })} accent={accent}>
                {p.label}
              </Chip>
            ))}
          </div>
        </div>
      </Group>

      <Group legend="When" size={legendSize}>
        <div role="group" aria-label="Day" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {DAYS.map((d) => (
            <Chip key={d.id} on={draft.day === d.id} onClick={() => set({ day: d.id })} accent={accent}>
              <span aria-hidden>{d.id}</span>
              <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                {d.long}
              </span>
            </Chip>
          ))}
        </div>
        <Grid min={150} gap={12}>
          <Field label="Start time">
            <input className="su-fld" type="time" value={draft.time} onChange={text("time")} />
          </Field>
          <Field label="Length">
            <select className="su-fld" value={draft.dur} onChange={text("dur")}>
              {LENGTHS.map((l) => (
                <option key={l.min} value={String(l.min)}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Repeats">
            <select className="su-fld" value={draft.repeat} onChange={text("repeat")}>
              {REPEATS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
          {mode === "studio" && (
            <Field label="Room (optional)">
              <input className="su-fld" value={draft.room} maxLength={LIMITS.room} onChange={text("room")} placeholder="Studio 2" />
            </Field>
          )}
        </Grid>
        <div style={hintStyle}>
          {mode === "studio" && venueLine ? `${venueLine} ` : ""}
          {draft.repeat === "once"
            ? "One date only."
            : `We schedule the next ${HORIZON_WEEKS} weeks of dates when you publish.`}
        </div>
      </Group>

      {mode === "independent" && (
        <Group legend="Where" size={legendSize}>
          <Grid min={220}>
            <SuburbCombobox
              variant="form"
              label="Suburb"
              value={suburb?.name ?? ""}
              studioSuburbs={[]}
              onPick={(name) => set({ suburb: name })}
              invalid={tried && !suburb}
              hint={suburb ? `NSW ${suburb.postcode} · ${suburb.area}` : "Beginners are matched by suburb and area"}
            />
            <Field label="Street address">
              <input
                className="su-fld"
                autoComplete="street-address"
                value={draft.address}
                maxLength={LIMITS.address}
                onChange={text("address")}
                placeholder="Level 1, 214 Crown St"
              />
            </Field>
          </Grid>
          <Field label="How to find the door" hint="Shown to people once they've booked.">
            <input
              className="su-fld"
              value={draft.arrive}
              maxLength={LIMITS.arrive}
              onChange={text("arrive")}
              placeholder="Blue door beside the café. Stairs to Level 1."
            />
          </Field>
        </Group>
      )}

      <Group legend="Spots and price" size={legendSize}>
        <Grid min={170} gap={12}>
          <Field label="Class size">
            <input className="su-fld" type="number" inputMode="numeric" min={2} max={80} value={draft.cap} onChange={text("cap")} />
          </Field>
          <Field label="First-timer spots">
            <input className="su-fld" type="number" inputMode="numeric" min={1} max={80} value={draft.newSpots} onChange={text("newSpots")} />
          </Field>
          <Field label="Regular price ($)">
            <input
              className="su-fld"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={canCharge ? draft.price : "0"}
              disabled={!canCharge}
              onChange={text("price")}
            />
          </Field>
        </Grid>
        <div style={hintStyle}>
          First-timer spots are kept for people who have never been to a class on StepUp; regulars
          go on the waitlist once the other spots are taken.
        </div>
        <div style={hintStyle}>
          {canCharge
            ? "Beginners see this price on the class page and pay it when they book."
            : mode === "studio"
              ? "Classes are free until payouts are set up. Once they are, you can charge."
              : "Your first class is free: set up payouts from your dashboard, then you can charge for classes."}
        </div>
      </Group>

      <Group legend="What to expect" size={legendSize}>
        <Field label="What to wear (optional)">
          <input
            className="su-fld"
            value={draft.wear}
            maxLength={LIMITS.wear}
            onChange={text("wear")}
            placeholder="Anything comfy. Smooth-soled shoes, or just socks."
          />
        </Field>
        <Field label="How the hour runs (optional)">
          <textarea
            className="su-fld"
            value={draft.plan}
            maxLength={LIMITS.plan}
            onChange={text("plan")}
            placeholder="0–15 min: basic step on your own. 15–40 min: one simple turn. 40–60 min: put it to music."
          />
        </Field>
      </Group>

      <fieldset
        style={{
          border: "1.5px solid oklch(22% 0.02 60)",
          borderRadius: 20,
          margin: 0,
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          background: CARD,
        }}
      >
        <legend style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 15, padding: "0 8px" }}>
          The First Timer promise
        </legend>
        {promises.map((label, i) => (
          <label key={label} style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", fontSize: 15 }}>
            <input
              type="checkbox"
              checked={draft.promise[i]}
              onChange={() =>
                set({ promise: draft.promise.map((v, j) => (j === i ? !v : v)) as ClassDraft["promise"] })
              }
              style={{ width: 20, height: 20, margin: "2px 0 0", accentColor: "oklch(55% 0.17 38)", flexShrink: 0 }}
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
    </>
  );
}

/** The draft as the form the server actions read. */
export function draftToFormData(d: ClassDraft, fd = new FormData()): FormData {
  const keys: (keyof ClassDraft)[] = [
    "title", "teacher", "style", "music", "partner", "day", "time", "dur", "repeat",
    "room", "cap", "newSpots", "price", "wear", "plan", "suburb", "address", "arrive",
  ];
  for (const k of keys) fd.set(k, String(d[k]));
  d.promise.forEach((on, i) => on && fd.set(`promise${i}`, "on"));
  return fd;
}
