"use client";

import { useActionState } from "react";
import { DISPLAY } from "@/lib/marketing-theme";
import { acceptInviteAction, type AcceptState } from "@/lib/actions/onboarding-actions";
import { errStyle } from "./fields";

/** One button: join the studio's team with the teacher account you're in. */
export function AcceptInvite({ code, studio, name }: { code: string; studio: string; name: string }) {
  const [state, action, pending] = useActionState<AcceptState, FormData>(acceptInviteAction, undefined);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
      <input type="hidden" name="code" value={code} />
      <button
        type="submit"
        className="su-btn stepup-cta-pill"
        disabled={pending}
        style={{
          border: 0,
          cursor: pending ? "progress" : "pointer",
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 17,
          padding: "16px 28px",
          borderRadius: 999,
          background: "oklch(63% 0.17 38)",
          color: "#fff",
        }}
      >
        {pending ? "Joining…" : `Join ${studio} as ${name}`}
      </button>
      {state?.error && (
        <span role="alert" style={errStyle}>
          {state.error}
        </span>
      )}
    </form>
  );
}
