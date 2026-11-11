"use client";

import { useActionState } from "react";
import Link from "next/link";
import { bookAsGuestAction } from "@/lib/actions/guest-actions";
import { C, DISPLAY } from "@/lib/marketing-theme";

const field: React.CSSProperties = {
  height: 56,
  padding: "0 18px",
  borderRadius: 16,
  border: "1.5px solid oklch(80% 0.01 70)",
  background: "oklch(99.5% 0.004 70)",
  fontSize: 17,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  width: "100%",
};

/**
 * Guest checkout: a name, an email, and the seat is yours.
 *
 * No password, and no account to make first. The booking is attached to a
 * User created on the spot with no password set, which is what lets the
 * waitlist, check-in and cancellation all work for a guest exactly as they do
 * for anybody else. Setting a password later turns it into a full account
 * with the booking already in it.
 */
export function GuestCheckoutForm({
  classId,
  isFull,
  priceLabel,
  loginHref,
}: {
  classId: string;
  isFull: boolean;
  priceLabel: string;
  loginHref: string;
}) {
  const [state, formAction, pending] = useActionState(
    bookAsGuestAction,
    undefined,
  );

  return (
    <form
      action={formAction}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
    >
      <input type="hidden" name="classId" value={classId} />

      {state?.error && (
        <div
          role="alert"
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            background: "oklch(94% 0.06 25)",
            color: "oklch(38% 0.14 25)",
            fontSize: 14,
            fontWeight: 600,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <span>{state.error}</span>
          {state.needsLogin && (
            <Link
              href={loginHref}
              style={{
                alignSelf: "flex-start",
                fontWeight: 700,
                color: "oklch(38% 0.14 25)",
                textDecoration: "underline",
              }}
            >
              Log in and book
            </Link>
          )}
        </div>
      )}

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Your name</span>
        <input
          name="name"
          required
          maxLength={80}
          autoComplete="name"
          placeholder="Sam Lee"
          style={field}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="sam@email.com"
          style={field}
        />
        <span style={{ fontSize: 13, color: C.inkSoft }}>
          Where your confirmation and the link to cancel go.
        </span>
      </label>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          borderRadius: 24,
          overflow: "hidden",
          border: `1.5px solid ${C.ink}`,
        }}
      >
        <button
          type="submit"
          disabled={pending}
          style={{
            height: 64,
            border: 0,
            background: pending ? "oklch(72% 0.09 38)" : C.heroBg,
            color: "#fff",
            cursor: pending ? "wait" : "pointer",
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 19,
          }}
        >
          {pending
            ? "Booking…"
            : isFull
              ? "Join the waitlist"
              : `Book my spot · ${priceLabel}`}
        </button>
        <div
          style={{
            padding: "16px 18px",
            background: "oklch(99.5% 0.004 70)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16 }}>
            No account needed.
          </span>
          <span style={{ fontSize: 13, color: C.inkSoft, textWrap: "pretty" }}>
            {isFull
              ? "We'll email you the moment a seat opens, and you can leave the waitlist from that email."
              : "We'll email your confirmation with a link to cancel. You can turn it into an account afterwards if you want one."}
          </span>
        </div>
      </div>
    </form>
  );
}
