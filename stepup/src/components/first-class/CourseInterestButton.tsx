"use client";

import { useState, useTransition } from "react";
import { courseInterestAction } from "@/lib/actions/class-actions";

/** "Tell me when it opens", with an email box for anyone not signed in. */
export function CourseInterestButton({ studioId, style, signedIn }: { studioId: string; style: string; signedIn: boolean }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (done) {
    return (
      <span role="status" style={{ fontWeight: 700, fontSize: 15, color: "oklch(38% 0.1 150)" }}>
        We&apos;ll email you when it opens ✓
      </span>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await courseInterestAction(studioId, style, email);
          if (r.ok) setDone(true);
          else setError(r.error);
        });
      }}
      style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}
    >
      {!signedIn && (
        <input
          type="email"
          required
          aria-label="Your email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="su-fld"
          style={{ flex: "1 1 200px", height: 46 }}
        />
      )}
      <button
        type="submit"
        disabled={pending}
        style={{
          cursor: "pointer",
          font: "inherit",
          fontWeight: 700,
          fontSize: 15,
          padding: "12px 20px",
          borderRadius: 999,
          border: "1.5px solid oklch(22% 0.02 60)",
          background: "transparent",
          color: "oklch(22% 0.02 60)",
        }}
      >
        {pending ? "Saving…" : "Tell me when it opens"}
      </button>
      {error && (
        <span role="alert" style={{ flexBasis: "100%", fontSize: 13, fontWeight: 600, color: "oklch(48% 0.17 30)" }}>
          {error}
        </span>
      )}
    </form>
  );
}
