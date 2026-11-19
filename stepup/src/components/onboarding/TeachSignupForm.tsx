"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useState } from "react";
import { C, DISPLAY } from "@/lib/marketing-theme";
import {
  createInstructorAction,
  joinStudioAction,
  type OnboardState,
} from "@/lib/actions/onboarding-actions";
import { findSuburb } from "@/lib/suburbs";
import { isAuMobile, isEmail, normaliseInviteCode } from "@/lib/team";
import { PASSWORD_HINT, PASSWORD_MIN } from "@/lib/password-rules";
import {
  BLANK_CLASS,
  DANCE_STYLES,
  INSTRUCTOR_PROMISES,
  classProblems,
  formatClock,
  isDay,
  isPartner,
  isRepeat,
  type ClassDraft,
} from "@/lib/class-form";
import { PhotoPicker } from "./PhotoPicker";
import { ClassFields, draftToFormData } from "./ClassFields";
import { ClassPreviewCard } from "./ClassPreviewCard";
import { createStoredDraft, str, strs } from "./storedDraft";
import { TEACH_DRAFT_KEY } from "./draft-keys";
import {
  Chip,
  Eyebrow,
  Field,
  Grid,
  Lede,
  PageTitle,
  StepNav,
  errStyle,
  hintStyle,
} from "./fields";

export type InviteView = {
  code: string;
  studio: string;
  suburb: string | null;
  invitedBy: string;
  name: string;
  contact: string;
  role: "TEACHER" | "MANAGER";
};

const YEARS = ["Less than 1", "1 to 3", "3 to 5", "5 to 10", "10+"];

type Profile = {
  name: string;
  email: string;
  phone: string;
  styles: string[];
  years: string;
  bio: string;
  note: string;
};

type Draft = Profile & { c: ClassDraft };

const EMPTY_PROFILE: Profile = { name: "", email: "", phone: "", styles: [], years: "", bio: "", note: "" };
const EMPTY: Draft = { ...EMPTY_PROFILE, c: BLANK_CLASS };

function parseClass(v: unknown): ClassDraft {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const s = (k: keyof ClassDraft, max = 160) => (typeof o[k] === "string" ? str(o[k], max) : (BLANK_CLASS[k] as string));
  const promise = Array.isArray(o.promise) ? o.promise.slice(0, 3).map(Boolean) : [];
  return {
    ...BLANK_CLASS,
    title: s("title", 80),
    style: s("style", 40),
    music: s("music", 20),
    partner: typeof o.partner === "string" && isPartner(o.partner) ? o.partner : BLANK_CLASS.partner,
    day: typeof o.day === "string" && isDay(o.day) ? o.day : BLANK_CLASS.day,
    time: s("time", 5),
    dur: s("dur", 3),
    repeat: typeof o.repeat === "string" && isRepeat(o.repeat) ? o.repeat : BLANK_CLASS.repeat,
    cap: s("cap", 3),
    newSpots: s("newSpots", 3),
    wear: s("wear"),
    plan: s("plan", 600),
    suburb: s("suburb", 40),
    address: s("address"),
    arrive: s("arrive", 200),
    promise: [Boolean(promise[0]), Boolean(promise[1]), Boolean(promise[2])],
  };
}

const useDraft = createStoredDraft<Draft>(TEACH_DRAFT_KEY, EMPTY, (v) => {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    name: str(o.name, 60),
    email: str(o.email, 120),
    phone: str(o.phone, 24),
    styles: strs(o.styles, DANCE_STYLES),
    years: YEARS.includes(str(o.years)) ? str(o.years) : "",
    bio: str(o.bio, 240),
    note: str(o.note, 140),
    c: parseClass(o.c),
  };
});

function accountProblems(p: Profile, password: string): string[] {
  const out: string[] = [];
  if (p.name.trim().length < 2) out.push("your name");
  if (!isEmail(p.email)) out.push("an email");
  if (p.phone.trim() && !isAuMobile(p.phone)) out.push("an Australian mobile (or leave it blank)");
  if (password.length < PASSWORD_MIN) out.push(`a password of ${PASSWORD_MIN}+ characters`);
  return out;
}

function profileProblems(p: Profile): string[] {
  const out: string[] = [];
  if (p.styles.length === 0) out.push("at least one style");
  if (!p.note.trim()) out.push("a note to first-timers");
  return out;
}

/**
 * The teacher page. Independent teachers make an account, a profile and their
 * first class (Account → Profile → Create class, then the Live page). Someone
 * invited by a studio makes an account and a profile and joins its team; the
 * studio makes the classes (Account → Profile, then On the team).
 */
export function TeachSignupForm({
  invite,
  codeError,
  initialCode = "",
}: {
  invite: InviteView | null;
  codeError?: string | null;
  initialCode?: string;
}) {
  const router = useRouter();
  const [stored, updateStored] = useDraft();
  // Invited sign-ups start from the invite, not from a draft someone else
  // may have left in this browser, and aren't saved.
  const [invited, setInvited] = useState<Draft>(() => ({
    ...EMPTY,
    name: invite?.name ?? "",
    email: invite && isEmail(invite.contact) ? invite.contact : "",
    phone: invite && isAuMobile(invite.contact) ? invite.contact : "",
  }));
  const d = invite ? invited : stored;
  const update = (patch: Partial<Draft>) =>
    invite ? setInvited((x) => ({ ...x, ...patch })) : updateStored(patch);

  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(false);
  const [code, setCode] = useState(initialCode);
  const [joining, setJoining] = useState(false);
  const [state, action, pending] = useActionState<OnboardState, FormData>(
    invite ? joinStudioAction : createInstructorAction,
    undefined,
  );

  const [seen, setSeen] = useState<OnboardState>(undefined);
  if (state !== seen) {
    setSeen(state);
    if (state?.step === "account") setStep(0);
    else if (state?.step === "profile") setStep(1);
    else if (state?.step === "class") setStep(2);
  }

  const last = invite ? 1 : 2;
  const cls: ClassDraft = { ...d.c, price: "0" };
  const probs =
    step === 0 ? accountProblems(d, password) : step === 1 ? profileProblems(d) : classProblems(cls, "independent");
  const setC = (patch: Partial<ClassDraft>) => update({ c: { ...d.c, ...patch } });
  const suburb = findSuburb(d.c.suburb);
  const teacher = d.name.trim() || "Your name";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (probs.length) {
      setTried(true);
      return;
    }
    setTried(false);
    if (step < last) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const fd = invite ? new FormData() : draftToFormData(cls);
    fd.set("name", d.name);
    fd.set("email", d.email);
    fd.set("phone", d.phone);
    fd.set("password", password);
    d.styles.forEach((s) => fd.append("teachStyles", s));
    fd.set("years", d.years);
    fd.set("bio", d.bio);
    fd.set("note", d.note);
    if (invite) fd.set("code", invite.code);
    if (photo) fd.set("photo", photo.file);
    startTransition(() => action(fd));
  }

  function join(e: React.FormEvent) {
    e.preventDefault();
    const c = normaliseInviteCode(code);
    if (!c) return;
    setJoining(true);
    router.push(`/join/${encodeURIComponent(c)}`);
  }

  const serverError = state && !pending ? state.error : null;
  const stepLabels = invite ? ["Account", "Profile", "On the team"] : ["Account", "Profile", "Create class", "Live"];

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "clamp(16px, 3vw, 32px) clamp(20px, 5vw, 48px) 96px",
        boxSizing: "border-box",
        display: "flex",
        flexWrap: "wrap",
        gap: "clamp(32px, 5vw, 64px)",
        alignItems: "flex-start",
      }}
    >
      <div style={{ flex: "999 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: 28 }}>
        {step === 0 && !invite && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Eyebrow>TEACH WITH STEPUP · STEP 1 OF 3</Eyebrow>
              <PageTitle>Fill your class with first-timers.</PageTitle>
              <Lede>
                Create an account, tell beginners who you are, then list your first class. It takes
                about five minutes.
              </Lede>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
                gap: 12,
              }}
            >
              <form
                onSubmit={join}
                style={{
                  margin: 0,
                  padding: 18,
                  borderRadius: 20,
                  background: "oklch(99.5% 0.004 70)",
                  border: "1px solid oklch(86% 0.01 70)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <label htmlFor="invite-code" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 17 }}>Invited by a studio?</span>
                  <span style={hintStyle}>Enter the code from your invite text or email.</span>
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    id="invite-code"
                    className="su-fld"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    value={code}
                    maxLength={80}
                    aria-invalid={Boolean(codeError)}
                    aria-describedby={codeError ? "invite-code-error" : undefined}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. RITMO-7K3QXM"
                    style={{ height: 48 }}
                  />
                  <button
                    type="submit"
                    className="su-btn"
                    disabled={joining}
                    style={{
                      flexShrink: 0,
                      border: 0,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontWeight: 700,
                      fontSize: 15,
                      padding: "0 18px",
                      borderRadius: 14,
                      background: C.ink,
                      color: "#fff",
                    }}
                  >
                    {joining ? "…" : "Join"}
                  </button>
                </div>
                {codeError && (
                  <span id="invite-code-error" role="alert" style={errStyle}>
                    {codeError}
                  </span>
                )}
              </form>
              <Link
                href="/studios/join"
                className="su-tint-card"
                style={{
                  padding: 18,
                  borderRadius: 20,
                  background: "oklch(94% 0.045 65)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  justifyContent: "space-between",
                  color: C.ink,
                  textDecoration: "none",
                }}
              >
                <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 17 }}>Run a studio?</span>
                <span style={{ fontSize: 15, color: "oklch(35% 0.02 60)" }}>
                  Sign up your studio instead, then invite your teachers.
                </span>
                <span style={{ fontWeight: 700, fontSize: 15, color: "oklch(45% 0.15 38)", marginTop: 6 }}>
                  Studio sign-up →
                </span>
              </Link>
            </div>
            <div style={{ ...hintStyle, marginTop: -12 }}>
              Teaching on your own? Carry on below. You&apos;ll list classes under your own name.
            </div>
          </div>
        )}

        <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {step === 0 && invite && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Eyebrow>JOIN {invite.studio.toUpperCase()} · STEP 1 OF 2</Eyebrow>
                <PageTitle>Join {invite.studio} on StepUp.</PageTitle>
                <Lede>
                  Make your login and teacher profile. {invite.studio} sets the timetable and lists the
                  classes; you just teach.
                </Lede>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                  padding: "16px 18px",
                  borderRadius: 20,
                  background: C.ink,
                  color: "oklch(96% 0.025 75)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "oklch(80% 0.1 50)" }}>
                    INVITE {invite.code}
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {invite.invitedBy} invited you to teach at {invite.studio}
                    {invite.suburb ? `, ${invite.suburb}` : ""}.
                  </span>
                </div>
                <Link
                  href="/teach"
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: "oklch(85% 0.02 70)",
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                  }}
                >
                  Not you? Sign up on your own
                </Link>
              </div>
            </>
          )}

          {step === 0 && (
            <>
              <Grid>
                <Field label="Full name">
                  <input className="su-fld" autoComplete="name" value={d.name} maxLength={60} onChange={(e) => update({ name: e.target.value })} placeholder="Maya Torres" />
                </Field>
                <Field
                  label="Mobile (optional)"
                  error={tried && d.phone.trim() && !isAuMobile(d.phone) ? "Use an Australian mobile, like 0412 345 678." : null}
                >
                  <input className="su-fld" type="tel" autoComplete="tel" value={d.phone} maxLength={24} onChange={(e) => update({ phone: e.target.value })} placeholder="0412 345 678" />
                </Field>
                <Field label="Email">
                  <input className="su-fld" type="email" autoComplete="email" value={d.email} maxLength={120} onChange={(e) => update({ email: e.target.value })} placeholder="maya@email.com" />
                </Field>
                <Field label="Password">
                  <input className="su-fld" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={PASSWORD_HINT} />
                </Field>
              </Grid>
              <div style={hintStyle}>
                Free to join. We&apos;ll email you a link to confirm your address.{" "}
                {invite ? (
                  <>
                    Already teach on StepUp?{" "}
                    <Link href={`/login?next=${encodeURIComponent(`/join/${invite.code}`)}`} style={{ color: C.ink, fontWeight: 700 }}>
                      Log in to accept with that account
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    Already on StepUp?{" "}
                    <Link href="/login" style={{ color: C.ink, fontWeight: 700 }}>
                      Log in
                    </Link>
                    .
                  </>
                )}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Eyebrow>STEP 2 OF {invite ? 2 : 3}</Eyebrow>
                <PageTitle size="clamp(34px, 5vw, 52px)">Your teacher profile</PageTitle>
                <Lede>Beginners book the teacher as much as the class. Keep it warm and short.</Lede>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a local preview (blob: URL)
                  <img src={photo.url} alt="Your profile photo" style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div
                    aria-hidden
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: "50%",
                      background: "oklch(63% 0.17 38)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: DISPLAY,
                      fontWeight: 800,
                      fontSize: 34,
                    }}
                  >
                    {(d.name.trim()[0] ?? "Y").toUpperCase()}
                  </div>
                )}
                <PhotoPicker
                  label="Add a photo"
                  hint="A smiling face beats a stage shot."
                  hasPhoto={photo !== null}
                  onPick={(file, url) => {
                    if (photo) URL.revokeObjectURL(photo.url);
                    setPhoto(file && url ? { file, url } : null);
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span id="teach-styles" style={{ fontSize: 13, fontWeight: 700 }}>
                  Styles you teach
                </span>
                <div role="group" aria-labelledby="teach-styles" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {DANCE_STYLES.map((s) => (
                    <Chip
                      key={s}
                      on={d.styles.includes(s)}
                      onClick={() =>
                        update({ styles: d.styles.includes(s) ? d.styles.filter((x) => x !== s) : [...d.styles, s] })
                      }
                    >
                      {s}
                    </Chip>
                  ))}
                </div>
              </div>
              <Field label="Years teaching" style={{ maxWidth: 280 }}>
                <select className="su-fld" value={d.years} onChange={(e) => update({ years: e.target.value })}>
                  <option value="">Choose</option>
                  {YEARS.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </Field>
              <Field label="Short bio (optional)" hint={`${240 - d.bio.length} characters left`}>
                <textarea
                  className="su-fld"
                  maxLength={240}
                  value={d.bio}
                  onChange={(e) => update({ bio: e.target.value })}
                  placeholder="Salsa teacher for 8 years. Trained in Cali, now teaching in Surry Hills."
                />
              </Field>
              <Field
                label="Your note to first-timers"
                hint={`Shown as your quote on every class page. ${140 - d.note.length} characters left.`}
              >
                <textarea
                  className="su-fld"
                  maxLength={140}
                  value={d.note}
                  onChange={(e) => update({ note: e.target.value })}
                  placeholder="Nobody's watching your feet but you. I'll go slow, and I'll learn your name."
                />
              </Field>
            </>
          )}

          {step === 2 && !invite && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Eyebrow>STEP 3 OF 3</Eyebrow>
                <PageTitle size="clamp(34px, 5vw, 52px)">Create a First Timer class</PageTitle>
                <Lede>This is what beginners see when we match them to you.</Lede>
              </div>
              <ClassFields
                draft={cls}
                set={setC}
                mode="independent"
                styles={d.styles.length ? d.styles : DANCE_STYLES}
                canCharge={false}
                promises={INSTRUCTOR_PROMISES}
                tried={tried}
              />
            </>
          )}

          {serverError && (
            <div role="alert" style={{ ...errStyle, fontSize: 15 }}>
              {serverError}
            </div>
          )}

          <StepNav
            showBack={step > 0}
            onBack={() => {
              setStep(Math.max(0, step - 1));
              setTried(false);
            }}
            missing={tried && probs.length ? `Still needed: ${probs.join(", ")}` : ""}
            nextLabel={
              invite
                ? ["Create account →", "Join the team →"][step]
                : ["Create account →", "Save profile →", "Publish class"][step]
            }
            blocked={probs.length > 0}
            pending={pending}
            primary={step === last}
          />
        </form>
        <ol aria-label="Steps" style={{ display: "flex", gap: 8, flexWrap: "wrap", listStyle: "none", margin: 0, padding: 0 }}>
          {stepLabels.map((label, i) => (
            <li
              key={label}
              aria-current={i === step ? "step" : undefined}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "6px 10px",
                borderRadius: 999,
                background: i === step ? "oklch(63% 0.17 38)" : "oklch(94% 0.01 70)",
                color: i === step ? "#fff" : "oklch(40% 0.02 60)",
              }}
            >
              {i + 1} · {label}
            </li>
          ))}
        </ol>
      </div>

      <aside
        aria-label="Preview"
        style={{
          flex: "1 1 340px",
          minWidth: 0,
          maxWidth: 440,
          position: "sticky",
          top: 24,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.14em", color: "oklch(45% 0.02 60)" }}>
          {invite ? `PREVIEW · HOW YOU APPEAR ON ${invite.studio.toUpperCase()} CLASSES` : "PREVIEW · HOW BEGINNERS WILL SEE IT"}
        </div>
        <ClassPreviewCard
          title={invite ? `Classes at ${invite.studio}` : d.c.title.trim() || "Your class name"}
          style={d.c.style || d.styles[0] || "Salsa"}
          partner={d.c.partner}
          when={invite ? "Times set by the studio" : `${d.c.day} ${formatClock(d.c.time)}`}
          where={invite ? `${invite.studio}${invite.suburb ? `, ${invite.suburb}` : ""}` : `${teacher}, ${suburb?.name ?? "your suburb"}`}
          teacher={teacher}
          note={d.note.trim() || "Your note to first-timers appears here."}
          priceCents={0}
          hidePrice={Boolean(invite)}
        />
        <div style={hintStyle}>This updates as you type.</div>
      </aside>
    </div>
  );
}
