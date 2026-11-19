"use client";

import { startTransition, useActionState, useState } from "react";
import { createIndependentClassAction, type TeachClassState } from "@/lib/actions/teach-actions";
import { findSuburb } from "@/lib/suburbs";
import {
  BLANK_CLASS,
  DANCE_STYLES,
  INSTRUCTOR_PROMISES,
  classProblems,
  formatClock,
  type ClassDraft,
} from "@/lib/class-form";
import { ClassFields, draftToFormData } from "@/components/onboarding/ClassFields";
import { ClassPreviewCard } from "@/components/onboarding/ClassPreviewCard";
import { StepNav, errStyle, hintStyle } from "@/components/onboarding/fields";

export function InstructorClassForm({
  teacher,
  note,
  styles,
  canCharge,
  photoUrl,
}: {
  teacher: string;
  note: string | null;
  styles: string[];
  canCharge: boolean;
  photoUrl: string | null;
}) {
  const [draft, setDraft] = useState<ClassDraft>(() => ({ ...BLANK_CLASS, price: canCharge ? BLANK_CLASS.price : "0" }));
  const [tried, setTried] = useState(false);
  const [state, action, pending] = useActionState<TeachClassState, FormData>(createIndependentClassAction, undefined);
  const effective = { ...draft, price: canCharge ? draft.price : "0" };
  const probs = classProblems(effective, "independent");
  const suburb = findSuburb(draft.suburb);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (probs.length) {
      setTried(true);
      return;
    }
    startTransition(() => action(draftToFormData(effective)));
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(24px, 4vw, 48px)", alignItems: "flex-start" }}>
      <form onSubmit={submit} noValidate className="su-compact" style={{ flex: "999 1 480px", minWidth: 0, display: "flex", flexDirection: "column", gap: 26 }}>
        <ClassFields
          draft={effective}
          set={(p) => setDraft((d) => ({ ...d, ...p }))}
          mode="independent"
          styles={styles.length ? styles : DANCE_STYLES}
          canCharge={canCharge}
          promises={INSTRUCTOR_PROMISES}
          tried={tried}
          legendSize={17}
        />
        {state?.error && !pending && (
          <div role="alert" style={{ ...errStyle, fontSize: 15 }}>
            {state.error}
          </div>
        )}
        <StepNav
          showBack={false}
          onBack={() => {}}
          missing={tried && probs.length ? `Still needed: ${probs.join(", ")}` : ""}
          nextLabel="Publish class"
          blocked={probs.length > 0}
          pending={pending}
          primary
        />
      </form>
      <aside aria-label="Class preview" style={{ flex: "1 1 300px", minWidth: 0, maxWidth: 400, position: "sticky", top: 96, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "oklch(46% 0.02 60)" }}>
          PREVIEW · HOW BEGINNERS SEE IT
        </div>
        <ClassPreviewCard
          title={draft.title.trim() || "Your class name"}
          style={draft.style || styles[0] || "Salsa"}
          partner={draft.partner}
          when={`${draft.day} ${formatClock(draft.time)}`}
          where={`${teacher}, ${suburb?.name ?? "your suburb"}`}
          teacher={teacher}
          note={note}
          priceCents={Number(effective.price) * 100 || 0}
          photoUrl={photoUrl}
        />
        <div style={hintStyle}>This updates as you type.</div>
      </aside>
    </div>
  );
}
