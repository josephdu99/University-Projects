"use client";

import { useState } from "react";
import { DISPLAY } from "@/lib/marketing-theme";
import { createStudioClassAction } from "@/lib/actions/studio-actions";
import {
  BLANK_CLASS,
  STUDIO_PROMISES,
  classProblems,
  formatClock,
  type ClassDraft,
} from "@/lib/class-form";
import { ClassFields, draftToFormData, type TeacherOption } from "@/components/onboarding/ClassFields";
import { ClassPreviewCard } from "@/components/onboarding/ClassPreviewCard";
import { errStyle, hintStyle } from "@/components/onboarding/fields";
import { PANEL_ID, useStudioPanels } from "./StudioPanels";

const ACCENT = "oklch(66% 0.19 35)";

export function CreateClassPanel({
  studioName,
  venueLine,
  styles,
  teachers,
  canCharge,
  prefill,
  photoUrl,
}: {
  studioName: string;
  venueLine: string;
  styles: readonly string[];
  teachers: TeacherOption[];
  canCharge: boolean;
  prefill: Partial<ClassDraft> | null;
  photoUrl: string | null;
}) {
  const { open, close, setToast } = useStudioPanels();
  const [draft, setDraft] = useState<ClassDraft>(() => ({
    ...BLANK_CLASS,
    price: canCharge ? BLANK_CLASS.price : "0",
    ...prefill,
  }));
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  if (open !== "class") return null;

  // The picked teacher, or the first on the team when none is picked yet (or
  // the one picked has since been taken off the list).
  const teacher = teachers.some((t) => t.id === draft.teacher) ? draft.teacher : (teachers[0]?.id ?? "");
  const effective: ClassDraft = { ...draft, teacher, price: canCharge ? draft.price : "0" };
  const probs = classProblems(effective, "studio");
  const set = (patch: Partial<ClassDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setServerError(null);
  };

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (probs.length) {
      setTried(true);
      return;
    }
    setPending(true);
    setServerError(null);
    try {
      const res = await createStudioClassAction(undefined, draftToFormData(effective));
      if (res?.ok) {
        setToast(res.message);
        setDraft({ ...BLANK_CLASS, teacher, price: canCharge ? BLANK_CLASS.price : "0" });
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

  const teacherName = teachers.find((t) => t.id === teacher)?.name ?? "Your teacher";

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
        padding: "32px clamp(18px, 3.5vw, 40px)",
        scrollMarginTop: 90,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "oklch(52% 0.16 35)", marginBottom: 6 }}>
            NEW FIRST TIMER CLASS
          </div>
          <h2 id="create-class-title" style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 30, letterSpacing: "-0.02em", margin: 0 }}>
            Create a class
          </h2>
        </div>
        <button
          type="button"
          className="su-btn"
          onClick={close}
          aria-label="Close create a class"
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
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(24px, 4vw, 48px)", alignItems: "flex-start" }}>
        <form
          onSubmit={publish}
          noValidate
          style={{ flex: "999 1 480px", minWidth: 0, display: "flex", flexDirection: "column", gap: 26, margin: 0 }}
        >
          <ClassFields
            draft={effective}
            set={set}
            mode="studio"
            styles={styles}
            teachers={teachers}
            canCharge={canCharge}
            venueLine={`At ${venueLine}.`}
            promises={STUDIO_PROMISES}
            tried={tried}
            accent={ACCENT}
            legendSize={17}
          />
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
              style={{
                border: 0,
                background: "transparent",
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 600,
                fontSize: 15,
                padding: "12px 4px",
                color: "oklch(42% 0.02 60)",
              }}
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
                {pending ? "Publishing…" : "Publish class"}
              </button>
            </div>
          </div>
        </form>

        <aside
          aria-label="Class preview"
          style={{
            flex: "1 1 300px",
            minWidth: 0,
            maxWidth: 400,
            position: "sticky",
            top: 96,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "oklch(46% 0.02 60)" }}>
            PREVIEW · HOW BEGINNERS SEE IT
          </div>
          <ClassPreviewCard
            title={draft.title.trim() || "Your class name"}
            style={draft.style || styles[0] || "Salsa"}
            partner={draft.partner}
            when={`${draft.day} ${formatClock(draft.time)}`}
            where={studioName}
            teacher={teacherName}
            priceCents={Number(effective.price) * 100 || 0}
            photoUrl={photoUrl}
          />
        </aside>
      </div>
    </section>
  );
}
