"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth-actions";
import { C } from "@/lib/marketing-theme";

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "13px 16px",
  borderRadius: 12,
  border: `1px solid ${C.borderInput}`,
  fontSize: 15,
  fontFamily: "inherit",
  background: C.card,
  color: C.ink,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "oklch(40% 0.02 60)",
  marginBottom: 6,
};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction}>
      <label style={labelStyle} htmlFor="li-email">
        Email
      </label>
      <input
        id="li-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        style={{ ...inputStyle, marginBottom: 18 }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 6,
        }}
      >
        <label style={{ ...labelStyle, marginBottom: 0 }} htmlFor="li-password">
          Password
        </label>
        <Link
          href="/forgot-password"
          style={{ fontSize: 13, fontWeight: 600, color: C.brand }}
        >
          Forgot password?
        </Link>
      </div>
      <input
        id="li-password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        placeholder="Enter your password"
        style={{ ...inputStyle, marginBottom: 26 }}
      />

      {state?.error && (
        <p
          role="alert"
          style={{
            background: "oklch(95% 0.05 25)",
            color: "oklch(45% 0.16 25)",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 14,
            margin: "0 0 18px",
          }}
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        style={{
          width: "100%",
          padding: 15,
          border: "none",
          borderRadius: 999,
          background: pending ? C.disabledBg : C.brand,
          color: pending ? C.disabledInk : C.onBrand,
          fontWeight: 700,
          fontSize: 16,
          fontFamily: "inherit",
          cursor: pending ? "not-allowed" : "pointer",
        }}
      >
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
