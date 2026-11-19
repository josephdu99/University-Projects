"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { createStudioAction, type OnboardState } from "@/lib/actions/onboarding-actions";
import { isValidAbn } from "@/lib/abn";
import { findSuburb } from "@/lib/suburbs";
import { isAuMobile, isEmail, initialsOf } from "@/lib/team";
import { DANCE_STYLES } from "@/lib/class-form";
import { PASSWORD_HINT, PASSWORD_MIN } from "@/lib/password-rules";
import { imageForStyle } from "@/lib/class-photo";
import { SuburbCombobox } from "@/components/first-class/SuburbCombobox";
import { PhotoPicker } from "./PhotoPicker";
import { createStoredDraft, str, strs } from "./storedDraft";
import { STUDIO_DRAFT_KEY } from "./draft-keys";
import {
  CARD,
  Chip,
  Eyebrow,
  Field,
  Grid,
  Group,
  Lede,
  PageTitle,
  StepNav,
  errStyle,
  hintStyle,
} from "./fields";



type Draft = {
  name: string;
  role: "owner" | "manager";
  email: string;
  phone: string;
  studioName: string;
  abn: string;
  suburb: string;
  address: string;
  arrive: string;
  styles: string[];
  about: string;
};

const EMPTY: Draft = {
  name: "",
  role: "owner",
  email: "",
  phone: "",
  studioName: "",
  abn: "",
  suburb: "",
  address: "",
  arrive: "",
  styles: [],
  about: "",
};

const useDraft = createStoredDraft<Draft>(STUDIO_DRAFT_KEY, EMPTY, (v) => {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    name: str(o.name, 60),
    role: o.role === "manager" ? "manager" : "owner",
    email: str(o.email, 120),
    phone: str(o.phone, 24),
    studioName: str(o.studioName, 80),
    abn: str(o.abn, 20),
    suburb: str(o.suburb, 40),
    address: str(o.address, 120),
    arrive: str(o.arrive, 200),
    styles: strs(o.styles, DANCE_STYLES),
    about: str(o.about, 280),
  };
});

const STEPS = ["Account", "Studio"] as const;

function problems(step: number, d: Draft, password: string): string[] {
  const out: string[] = [];
  if (step === 0) {
    if (d.name.trim().length < 2) out.push("your name");
    if (!isEmail(d.email)) out.push("an email");
    if (!isAuMobile(d.phone)) out.push("an Australian mobile");
    if (password.length < PASSWORD_MIN) out.push(`a password of ${PASSWORD_MIN}+ characters`);
  } else {
    if (d.studioName.trim().length < 2) out.push("the studio name");
    if (!isValidAbn(d.abn)) out.push("a valid ABN");
    if (!findSuburb(d.suburb)) out.push("a suburb from the list");
    if (d.address.trim().length < 3) out.push("the address");
    if (d.styles.length === 0) out.push("at least one style");
  }
  return out;
}

export function StudioSignupForm() {
  const [d, update] = useDraft();
  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(false);
  const [state, action, pending] = useActionState<OnboardState, FormData>(
    createStudioAction,
    undefined,
  );

  // A server-side problem belongs to a step; go back to it. Adjusting state
  // while rendering, as React recommends, rather than in an effect.
  const [seen, setSeen] = useState<OnboardState>(undefined);
  if (state !== seen) {
    setSeen(state);
    if (state?.step === "account") setStep(0);
    else if (state?.step === "studio") setStep(1);
  }

  const probs = problems(step, d, password);
  const suburb = findSuburb(d.suburb);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (probs.length) {
      setTried(true);
      return;
    }
    setTried(false);
    if (step === 0) {
      setStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const fd = new FormData();
    fd.set("name", d.name);
    fd.set("role", d.role);
    fd.set("email", d.email);
    fd.set("phone", d.phone);
    fd.set("password", password);
    fd.set("studioName", d.studioName);
    fd.set("abn", d.abn);
    fd.set("suburb", suburb?.name ?? "");
    fd.set("address", d.address);
    fd.set("arrive", d.arrive);
    fd.set("about", d.about);
    d.styles.forEach((s) => fd.append("styles", s));
    if (photo) fd.set("photo", photo.file);
    startTransition(() => action(fd));
  }

  const toggleStyle = (s: string) =>
    update({ styles: d.styles.includes(s) ? d.styles.filter((x) => x !== s) : [...d.styles, s] });

  const abnHint = !d.abn
    ? "11 digits, as on your ABN registration."
    : isValidAbn(d.abn)
      ? "ABN looks right."
      : "That ABN doesn’t look right. It should be 11 digits.";

  const serverError = state && !pending ? state.error : null;

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
      <form
        onSubmit={submit}
        noValidate
        style={{ flex: "999 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: 28 }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Eyebrow>
            STUDIO SIGN-UP · STEP {step + 1} OF {STEPS.length}
          </Eyebrow>
          {step === 0 ? (
            <>
              <PageTitle>Bring your studio to Sydney&apos;s beginners.</PageTitle>
              <Lede>
                Two quick steps to set up your studio page. Then invite your teachers and list
                classes from your studio dashboard.
              </Lede>
            </>
          ) : (
            <>
              <PageTitle size="clamp(34px, 5vw, 52px)">Your studio</PageTitle>
              <Lede>This is your public studio page. Every class you list sits under it.</Lede>
            </>
          )}
        </div>

        {step === 0 && (
          <>
            <Group legend="About you">
              <Grid>
                <Field label="Your full name">
                  <input
                    className="su-fld"
                    autoComplete="name"
                    value={d.name}
                    maxLength={60}
                    onChange={(e) => update({ name: e.target.value })}
                    placeholder="Ana Ruiz"
                  />
                </Field>
                <Field label="Your role">
                  <select
                    className="su-fld"
                    value={d.role}
                    onChange={(e) => update({ role: e.target.value === "manager" ? "manager" : "owner" })}
                  >
                    <option value="owner">Owner</option>
                    <option value="manager">Manager</option>
                  </select>
                </Field>
                <Field label="Email">
                  <input
                    className="su-fld"
                    type="email"
                    autoComplete="email"
                    value={d.email}
                    maxLength={120}
                    onChange={(e) => update({ email: e.target.value })}
                    placeholder="ana@ritmodance.com.au"
                  />
                </Field>
                <Field
                  label="Mobile"
                  error={tried && d.phone && !isAuMobile(d.phone) ? "Use an Australian mobile, like 0412 345 678." : null}
                >
                  <input
                    className="su-fld"
                    type="tel"
                    autoComplete="tel"
                    value={d.phone}
                    maxLength={24}
                    onChange={(e) => update({ phone: e.target.value })}
                    placeholder="0412 345 678"
                  />
                </Field>
                <Field label="Password">
                  <input
                    className="su-fld"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={PASSWORD_HINT}
                  />
                </Field>
              </Grid>
            </Group>
            <div style={hintStyle}>
              Free to join. We&apos;ll email you a link to confirm your address. Already on StepUp?{" "}
              <Link href="/login" style={{ color: C.ink, fontWeight: 700 }}>
                Log in
              </Link>
              .
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <Group legend="The business">
              <Grid>
                <Field label="Studio name">
                  <input
                    className="su-fld"
                    autoComplete="organization"
                    value={d.studioName}
                    maxLength={80}
                    onChange={(e) => update({ studioName: e.target.value })}
                    placeholder="Ritmo Dance Studio"
                  />
                </Field>
                <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>ABN</span>
                  <input
                    className="su-fld"
                    inputMode="numeric"
                    value={d.abn}
                    maxLength={20}
                    aria-invalid={Boolean(d.abn) && !isValidAbn(d.abn)}
                    onChange={(e) => update({ abn: e.target.value })}
                    placeholder="51 824 753 556"
                  />
                  <span style={d.abn && !isValidAbn(d.abn) ? errStyle : hintStyle}>{abnHint}</span>
                </label>
              </Grid>
            </Group>
            <Group legend="Where you are">
              <Grid min={220}>
                <SuburbCombobox
                  variant="form"
                  label="Suburb"
                  value={suburb?.name ?? ""}
                  studioSuburbs={[]}
                  onPick={(name) => update({ suburb: name })}
                  invalid={tried && !suburb}
                  hint={
                    suburb
                      ? `NSW ${suburb.postcode} · ${suburb.area}`
                      : "Beginners are matched by suburb and area"
                  }
                />
                <Field label="Street address">
                  <input
                    className="su-fld"
                    autoComplete="street-address"
                    value={d.address}
                    maxLength={120}
                    onChange={(e) => update({ address: e.target.value })}
                    placeholder="Level 1, 214 Crown St"
                  />
                </Field>
              </Grid>
              <Field label="How to find the door" hint="Shown to people once they've booked.">
                <input
                  className="su-fld"
                  value={d.arrive}
                  maxLength={200}
                  onChange={(e) => update({ arrive: e.target.value })}
                  placeholder="Blue door beside the café. Stairs to Level 1."
                />
              </Field>
            </Group>
            <Group legend="What you teach">
              <div role="group" aria-label="Styles offered" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {DANCE_STYLES.map((s) => (
                  <Chip key={s} on={d.styles.includes(s)} onClick={() => toggleStyle(s)}>
                    {s}
                  </Chip>
                ))}
              </div>
              <Field label="About the studio" hint={`${280 - d.about.length} characters left`}>
                <textarea
                  className="su-fld"
                  maxLength={280}
                  value={d.about}
                  onChange={(e) => update({ about: e.target.value })}
                  placeholder="Latin dance studio in Surry Hills since 2014. Small classes, big music, beginners every night."
                />
              </Field>
              <PhotoPicker
                label="Add a studio photo"
                hint="The room with people in it works best."
                hasPhoto={photo !== null}
                onPick={(file, url) => {
                  if (photo) URL.revokeObjectURL(photo.url);
                  setPhoto(file && url ? { file, url } : null);
                }}
              />
            </Group>
          </>
        )}

        {serverError && (
          <div role="alert" style={{ ...errStyle, fontSize: 15 }}>
            {serverError}
            {/log in/i.test(serverError) && (
              <>
                {" "}
                <Link href="/login" style={{ color: "inherit" }}>
                  Go to log in
                </Link>
              </>
            )}
          </div>
        )}

        <StepNav
          showBack={step > 0}
          onBack={() => {
            setStep(0);
            setTried(false);
          }}
          missing={tried && probs.length ? `Still needed: ${probs.join(", ")}` : ""}
          nextLabel={step === 0 ? "Create account →" : "Create studio"}
          blocked={probs.length > 0}
          pending={pending}
          primary={step === 1}
        />
      </form>

      <aside
        aria-label="Preview of your studio page"
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
          PREVIEW · YOUR STUDIO PAGE
        </div>
        <StudioCard
          photoUrl={photo?.url ?? null}
          name={d.studioName.trim() || "Your studio name"}
          where={suburb ? `${suburb.name} · ${suburb.area}` : "Your suburb"}
          styles={d.styles}
          about={d.about.trim() || "A line or two about your studio appears here."}
          ownerName={d.name}
        />
        <div style={hintStyle}>This updates as you type.</div>
      </aside>
    </div>
  );
}

export function StudioCard({
  photoUrl,
  name,
  where,
  styles,
  about,
  ownerName,
  teamLabel = "Invite your teachers from your dashboard",
}: {
  photoUrl: string | null;
  name: string;
  where: string;
  styles: string[];
  about: string;
  ownerName: string;
  teamLabel?: string;
}) {
  const img = photoUrl ?? imageForStyle(styles[0] ?? "salsa").src;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 28,
        overflow: "hidden",
        background: CARD,
        border: "1px solid oklch(88% 0.01 70)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a local preview (blob: URL) or a stand-in */}
      <img
        src={img}
        alt=""
        style={{ display: "block", width: "100%", aspectRatio: "16/10", objectFit: "cover" }}
      />
      <div style={{ padding: "20px 22px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div
            style={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: 24,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              overflowWrap: "anywhere",
            }}
          >
            {name}
          </div>
          <div style={{ fontSize: 15, color: "oklch(45% 0.02 60)" }}>{where}</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(styles.length ? styles : ["Your styles"]).map((s) => (
            <span
              key={s}
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid oklch(86% 0.01 70)",
              }}
            >
              {s}
            </span>
          ))}
        </div>
        <div style={{ fontSize: 15, color: "oklch(35% 0.02 60)", textWrap: "pretty", overflowWrap: "anywhere" }}>
          {about}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            paddingTop: 10,
            borderTop: "1px solid oklch(90% 0.01 70)",
          }}
        >
          <span
            aria-hidden
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "oklch(63% 0.17 38)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            {initialsOf(ownerName || "You").slice(0, 1)}
          </span>
          <span style={hintStyle}>{teamLabel}</span>
        </div>
      </div>
    </div>
  );
}
