"use client";

import { useState } from "react";
import { DISPLAY } from "@/lib/marketing-theme";
import { createStudioClassV2Action } from "@/lib/actions/studio-admin-actions";
import { DAYS, LENGTHS, MUSIC_OPTIONS, REPEATS, formatClock } from "@/lib/class-form";
import { LISTINGS, nextTermStart } from "@/lib/listing";
import { LEVEL_SCALE, levelOptionLabel, scaleLabel } from "@/lib/levels";
import { PARTNER_RULES } from "@/lib/partner-roles";
import { POLICIES, POLICY_IDS, type PolicyId } from "@/lib/policies";
import { templateFor } from "@/lib/class-templates";
import {
  BLANK_STUDIO_CLASS,
  DESC_MAX,
  STUDIO_CLASS_PROMISES,
  sortDays,
  studioClassProblems,
  studioDraftToFormData,
  type StudioClassDraft,
} from "@/lib/studio-class-form";
import { Field, Grid, Group, Chip, errStyle, hintStyle } from "@/components/onboarding/fields";
import { PANEL_ID, useStudioPanels } from "./StudioPanels";

const ACCENT = "oklch(66% 0.19 35)";

export type CreateTeacher = { id: string; label: string; name: string; wwccOk: boolean };
export type CreateVenue = { id: string; name: string; address: string };
export type SavedTemplate = { style: string; scale: string; description: string; wear: string; plan: string };

function shortDate(key: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return "";
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
}

/**
 * Create a class (flow v6.4): how it's listed, the level on StepUp's one
 * scale, a description from the studio's template, partner rules with
 * per-role waitlists, a saved venue, the spots StepUp may sell, a
 * cancellation preset and the kids' flag. It opens in the page, above the
 * timetable, with a live preview of how students see it.
 */
export function CreateClassV2({
  studioName,
  styles,
  teachers,
  venues,
  levelNames,
  templates,
  studioPolicy,
  canCharge,
  today,
  photoUrl,
  prefill,
}: {
  studioName: string;
  styles: readonly string[];
  teachers: CreateTeacher[];
  /** The studio's own address first (id "studio"), then saved venues. */
  venues: CreateVenue[];
  levelNames: { name: string; scale: string }[];
  templates: SavedTemplate[];
  studioPolicy: PolicyId;
  canCharge: boolean;
  /** Today in the studio's time zone, "yyyy-MM-dd". */
  today: string;
  photoUrl: string | null;
  prefill: Partial<StudioClassDraft> | null;
}) {
  const { open, close, setToast } = useStudioPanels();
  const [draft, setDraft] = useState<StudioClassDraft>(() => ({
    ...BLANK_STUDIO_CLASS,
    price: canCharge ? BLANK_STUDIO_CLASS.price : "0",
    ...prefill,
  }));
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  if (open !== "class") return null;

  const teacherId = teachers.some((t) => t.id === draft.teacher) ? draft.teacher : (teachers[0]?.id ?? "");
  const teacher = teachers.find((t) => t.id === teacherId);
  const d: StudioClassDraft = { ...draft, teacher: teacherId };
  const probs = studioClassProblems(d, { teacherWwccOk: Boolean(teacher?.wwccOk), today, canCharge });
  const set = (patch: Partial<StudioClassDraft>) => {
    setDraft((x) => ({ ...x, ...patch }));
    setServerError(null);
  };
  const text =
    (k: keyof StudioClassDraft) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      set({ [k]: e.target.value } as Partial<StudioClassDraft>);

  const tpl = templateFor(d.style, d.level || "BEGINNER", templates);
  const templateName = d.style ? `${d.style}${d.level ? ` ${scaleLabel(d.level).toLowerCase()}` : ""}` : "class";
  const isCourse = d.listing === "COURSE";
  const venue = venues.find((v) => v.id === d.venue) ?? venues[0];
  const policy: PolicyId = d.policy === "studio" ? studioPolicy : d.policy;

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (probs.length) {
      setTried(true);
      return;
    }
    setPending(true);
    setServerError(null);
    try {
      const res = await createStudioClassV2Action(undefined, studioDraftToFormData(d));
      if (res?.ok) {
        setToast(res.message);
        setDraft({ ...BLANK_STUDIO_CLASS, teacher: teacherId, price: canCharge ? BLANK_STUDIO_CLASS.price : "0" });
        setTried(false);
        close();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setServerError(res?.error ?? "Something went wrong. Try again.");
      }
    } catch {
      setServerError("We couldn't reach StepUp. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  // ── Preview ──
  const dayNames = DAYS.filter((x) => d.days.includes(x.id));
  const pWhen = isCourse
    ? `${d.termStart ? `From ${shortDate(d.termStart)}` : "Term start"} · ${d.weeks || "?"} weeks · ${formatClock(d.time)}`
    : `${
        dayNames.length === 0 ? "Pick a day" : dayNames.length === 1 ? dayNames[0].long : dayNames.map((x) => x.id).join(", ")
      } ${formatClock(d.time)}`;
  const pPrice =
    d.listing === "TRIAL"
      ? "Free trial"
      : d.listing === "COURSE"
        ? `$${d.coursePrice || 0} for ${d.weeks || "?"} weeks`
        : Number(d.price) > 0
          ? `$${d.price}`
          : "Free";
  const pCta = d.listing === "COURSE" ? "Enrol" : d.listing === "TRIAL" ? "Book free trial" : "Book";
  const publishLabel = pending
    ? "Publishing…"
    : d.listing === "COURSE"
      ? "Open enrolments"
      : !isCourse && d.days.length > 1
        ? `Publish ${d.days.length} classes`
        : "Publish class";

  return (
    <section
      id={PANEL_ID.class}
      aria-labelledby="create-class-title"
      className="su-panel-in su-compact"
      style={{
        marginBottom: 28,
        background: "oklch(99% 0.005 70)",
        border: "1.5px solid oklch(22% 0.02 60)",
        borderRadius: 28,
        padding: "30px clamp(18px, 3.5vw, 40px)",
        scrollMarginTop: 90,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <div>
          <div className="sd-kicker" style={{ marginBottom: 6 }}>
            New class
          </div>
          <h2 id="create-class-title" style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 30, letterSpacing: "-0.02em", margin: 0 }}>
            Create a class
          </h2>
        </div>
        <CloseButton onClick={close} label="Close create a class" />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(24px, 4vw, 48px)", alignItems: "flex-start" }}>
        <form onSubmit={publish} noValidate style={{ flex: "999 1 480px", minWidth: 0, display: "flex", flexDirection: "column", gap: 28, margin: 0 }}>
          <Group legend="How it's listed" size={17}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 10 }}>
              {LISTINGS.map((o) => (
                <label key={o.id} className="sd-radio-card">
                  <input type="radio" name="listing" checked={d.listing === o.id} onChange={() => set({ listing: o.id })} />
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <strong>{o.label}</strong>
                    <span className="sd-hint">{o.how}</span>
                  </span>
                </label>
              ))}
            </div>
            {isCourse && (
              <Grid min={160} gap={12}>
                <Field label="Course length (weeks)">
                  <input className="su-fld" type="number" min={2} max={20} value={d.weeks} onChange={text("weeks")} />
                </Field>
                <Field label="Term starts">
                  <input className="su-fld" type="date" min={today} value={d.termStart} onChange={text("termStart")} />
                </Field>
                <Field label="Course price ($)">
                  <input className="su-fld" type="number" min={0} value={d.coursePrice} onChange={text("coursePrice")} />
                </Field>
              </Grid>
            )}
            {isCourse && (
              <span style={hintStyle}>
                {`Students book the whole course as one purchase. Once the course has started, the class shows "Next term starts ${
                  d.termStart && Number(d.weeks) ? shortDate(nextTermStart(d.termStart, Number(d.weeks))) : "after this one"
                }" and anyone can ask to hear when it opens.`}
              </span>
            )}
            {d.listing === "TRIAL" && <span style={hintStyle}>Free first visit, one per student per studio. No commission is charged.</span>}
          </Group>

          <Group legend="The class" size={17}>
            <Grid min={200} gap={12}>
              <Field label="Class name">
                <input className="su-fld" value={d.title} maxLength={80} onChange={text("title")} placeholder="Salsa Foundations" />
              </Field>
              <Field label="Teacher">
                <select className="su-fld" value={d.teacher} onChange={text("teacher")}>
                  <option value="">Choose a teacher</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Style">
                <select className="su-fld" value={d.style} onChange={text("style")}>
                  <option value="">Choose a style</option>
                  {styles.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Level">
                <select className="su-fld" value={d.level} onChange={text("level")}>
                  <option value="">Choose a level</option>
                  {LEVEL_SCALE.map((l) => (
                    <option key={l.id} value={l.id}>
                      {levelOptionLabel(l.id, levelNames)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Music it's danced to">
                <select className="su-fld" value={d.music} onChange={text("music")}>
                  <option value="">Choose</option>
                  {MUSIC_OPTIONS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
            </Grid>
            <span style={hintStyle}>
              {teachers.length
                ? "Teachers whose invite is pending can be assigned now. They see the class once they join."
                : "Invite a teacher first on the Team tab, or tick “I teach classes here too” there."}
            </span>
            <Field label="Description" hint={`${DESC_MAX - d.desc.length} characters left`}>
              <textarea
                className="su-fld"
                value={d.desc}
                maxLength={DESC_MAX}
                onChange={text("desc")}
                placeholder="Pick a style and level, then start from a template."
              />
            </Field>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
              <button
                type="button"
                className="sd-btn-ghost"
                disabled={!d.style}
                onClick={() => set({ desc: tpl.description, wear: tpl.wear, plan: tpl.plan })}
              >
                Start from the {templateName} template
              </button>
              <span style={hintStyle}>Templates fill the description, what to wear and how the hour runs. Edit them in Profile.</span>
            </div>
          </Group>

          <Group legend="Partner work" size={17}>
            <label className="sd-check">
              <input type="checkbox" checked={d.partnerClass} onChange={(e) => set({ partnerClass: e.target.checked })} />
              <span>
                <strong>Partner class</strong> <span className="sd-hint">Students pick Lead, Follow or Either when they book.</span>
              </span>
            </label>
            {d.partnerClass && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 10 }}>
                  {PARTNER_RULES.map((o) => (
                    <label key={o.id} className="sd-radio-card">
                      <input type="radio" name="rule" checked={d.rule === o.id} onChange={() => set({ rule: o.id })} />
                      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <strong>{o.label}</strong>
                        <span className="sd-hint">{o.how}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {d.rule === "CAPS" && (
                  <Grid min={140} gap={12}>
                    <Field label="Leads">
                      <input className="su-fld" type="number" min={1} value={d.leadCap} onChange={text("leadCap")} />
                    </Field>
                    <Field label="Follows">
                      <input className="su-fld" type="number" min={1} value={d.followCap} onChange={text("followCap")} />
                    </Field>
                  </Grid>
                )}
                {d.rule === "BALANCE" && (
                  <Field label="Most extra on either side" style={{ maxWidth: 260 }}>
                    <input className="su-fld" type="number" min={0} max={10} value={d.balanceX} onChange={text("balanceX")} />
                  </Field>
                )}
                <span style={hintStyle}>
                  {`Each role has its own waitlist. When a spot opens on one side, the first person waiting for that role is offered it automatically. "Either" students fill whichever side is short, and the class page shows "Leads needed" or "Follows needed".`}
                </span>
              </div>
            )}
          </Group>

          <Group legend={isCourse ? "Time and place" : "When and where"} size={17}>
            {!isCourse && (
              <div role="group" aria-label="Days, pick one or more" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {DAYS.map((x) => (
                  <Chip
                    key={x.id}
                    on={d.days.includes(x.id)}
                    onClick={() => set({ days: sortDays(d.days.includes(x.id) ? d.days.filter((y) => y !== x.id) : [...d.days, x.id]) })}
                    accent={ACCENT}
                  >
                    {x.id}
                  </Chip>
                ))}
              </div>
            )}
            <Grid min={150} gap={12}>
              <Field label="Start time">
                <input className="su-fld" type="time" value={d.time} onChange={text("time")} />
              </Field>
              <Field label="Length">
                <select className="su-fld" value={d.dur} onChange={text("dur")}>
                  {LENGTHS.map((l) => (
                    <option key={l.min} value={String(l.min)}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </Field>
              {!isCourse && (
                <Field label="Repeats">
                  <select className="su-fld" value={d.repeat} onChange={text("repeat")}>
                    {REPEATS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Venue">
                <select className="su-fld" value={d.venue} onChange={text("venue")}>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </Field>
            </Grid>
            <span style={hintStyle}>
              {isCourse
                ? "Weekly from the term start, on that weekday. Saved venues are managed in Profile."
                : `Pick as many days as it runs. ${
                    d.days.length > 1 ? `Each day is its own class on your timetable, at the same time. ` : ""
                  }Saved venues are managed in Profile. Repeating classes are scheduled 12 weeks ahead.`}
            </span>
          </Group>

          <Group legend="Spots, price and policy" size={17}>
            <Grid min={200} gap={12}>
              <Field label="Room capacity">
                <input className="su-fld" type="number" min={2} max={80} value={d.cap} onChange={text("cap")} />
              </Field>
              <Field label="Spots for StepUp">
                <input className="su-fld" type="number" min={1} max={80} value={d.setAside} onChange={text("setAside")} />
              </Field>
              {d.listing === "DROP_IN" && (
                <Field label="Drop-in price ($)" hint={canCharge ? undefined : "Set up payouts to charge. Free works now."}>
                  <input className="su-fld" type="number" min={0} value={d.price} onChange={text("price")} />
                </Field>
              )}
              <Field label="Cancellation policy">
                <select className="su-fld" value={d.policy} onChange={(e) => set({ policy: e.target.value as StudioClassDraft["policy"] })}>
                  <option value="studio">Studio default ({POLICIES[studioPolicy].label})</option>
                  {POLICY_IDS.map((p) => (
                    <option key={p} value={p}>
                      {POLICIES[p].label}
                    </option>
                  ))}
                </select>
              </Field>
            </Grid>
            <span style={hintStyle}>
              StepUp only ever sells the spots you set aside. Your pass holders keep the rest, and your own pricing stays untouched.
            </span>
            <label className="sd-check">
              <input type="checkbox" checked={d.kids} onChange={(e) => set({ kids: e.target.checked })} />
              <span>
                <strong>Kids&apos; class</strong>{" "}
                <span className="sd-hint">
                  Booked by a parent or guardian. The teacher needs a verified Working With Children Check before it goes live.
                </span>
              </span>
            </label>
            {d.kids && !teacher?.wwccOk && (
              <div className="sd-err">
                {`${teacher?.name ?? "This teacher"} has no verified Working With Children Check yet. Add it on the Team tab, then publish.`}
              </div>
            )}
            {d.kids && teacher?.wwccOk && (
              <div className="sd-hint">
                Guardian booking isn&apos;t open on StepUp yet, so a kids&apos; class goes on your timetable but can&apos;t be booked here until it is.
              </div>
            )}
          </Group>

          <Group legend="What to expect" size={17}>
            <Field label="What to wear">
              <input className="su-fld" value={d.wear} maxLength={160} onChange={text("wear")} placeholder="Anything comfy. Smooth-soled shoes, or just socks." />
            </Field>
            <Field label="How the hour runs">
              <textarea
                className="su-fld"
                value={d.plan}
                maxLength={600}
                onChange={text("plan")}
                placeholder="0–15 min: basic step on your own. 15–40 min: one simple turn. 40–60 min: put it to music."
              />
            </Field>
          </Group>

          <Group legend="The First Timer promise" size={17}>
            {STUDIO_CLASS_PROMISES.map((label, i) => (
              <label key={label} className="sd-check">
                <input
                  type="checkbox"
                  checked={d.promise[i]}
                  onChange={(e) => {
                    const promise = [...d.promise] as StudioClassDraft["promise"];
                    promise[i] = e.target.checked;
                    set({ promise });
                  }}
                />
                <span>{label}</span>
              </label>
            ))}
          </Group>

          {serverError && (
            <div role="alert" style={{ ...errStyle, fontSize: 15 }}>
              {serverError}
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              paddingTop: 8,
              borderTop: "1px solid oklch(90% 0.01 70)",
            }}
          >
            <button
              type="button"
              className="su-btn"
              onClick={close}
              style={{ border: 0, background: "transparent", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 15, padding: "12px 4px", color: "oklch(42% 0.02 60)" }}
            >
              Cancel
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <span role="status" style={tried && probs.length ? errStyle : hintStyle}>
                {tried && probs.length ? `Still needed: ${probs.join(", ")}` : ""}
              </span>
              <button
                type="submit"
                className="su-btn"
                disabled={pending}
                style={{
                  border: 0,
                  cursor: pending ? "progress" : "pointer",
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: 16,
                  padding: "15px 26px",
                  borderRadius: 999,
                  background: probs.length ? "oklch(88% 0.01 70)" : ACCENT,
                  color: probs.length ? "oklch(40% 0.02 60)" : "#fff",
                }}
              >
                {publishLabel}
              </button>
            </div>
          </div>
        </form>

        <aside
          aria-label="Class preview"
          style={{ flex: "1 1 300px", minWidth: 0, maxWidth: 400, position: "sticky", top: 96, display: "flex", flexDirection: "column", gap: 10 }}
        >
          <div className="sd-kicker" style={{ color: "oklch(46% 0.02 60)" }}>
            Preview · how students see it
          </div>
          <div className="sd-card" style={{ overflow: "hidden" }}>
            <div
              style={{
                position: "relative",
                height: 170,
                background: photoUrl ? `center / cover no-repeat url(${photoUrl})` : "linear-gradient(135deg, oklch(70% 0.15 40), oklch(55% 0.17 20))",
              }}
            >
              <div style={{ position: "absolute", left: 12, top: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="sd-chip" style={{ background: "oklch(99% 0.005 70)", color: "oklch(22% 0.02 60)" }}>
                  {LISTINGS.find((l) => l.id === d.listing)?.label}
                </span>
                {d.level && (
                  <span className="sd-chip" style={{ background: "oklch(22% 0.02 60)", color: "oklch(97% 0.01 70)" }}>
                    {scaleLabel(d.level)}
                  </span>
                )}
              </div>
            </div>
            <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 20 }}>{d.title.trim() || "Your class name"}</div>
              <div className="sd-hint">
                {pWhen} · {venue?.name ?? studioName}
              </div>
              <div className="sd-hint">
                With {teacher?.name ?? "your teacher"} · {d.partnerClass ? "Partner class · pick Lead, Follow or Either" : "No partner needed"}
              </div>
              <div className="sd-hint">{`Free cancellation until ${POLICIES[policy].until}. After that, ${POLICIES[policy].after}.`}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 18 }}>{pPrice}</span>
                <span className="sd-chip" style={{ background: ACCENT, color: "#fff", fontSize: 13, padding: "7px 14px" }}>
                  {pCta}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export function CloseButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      className="su-btn no-print"
      onClick={onClick}
      aria-label={label}
      style={{
        flex: "none",
        width: 40,
        height: 40,
        borderRadius: "50%",
        border: "1px solid oklch(86% 0.012 70)",
        background: "transparent",
        cursor: "pointer",
        fontSize: 20,
        lineHeight: 1,
      }}
    >
      ×
    </button>
  );
}
