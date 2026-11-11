"use client";

import { useActionState } from "react";
import { bookClassAction } from "@/lib/actions/class-actions";
import { C, DISPLAY } from "@/lib/marketing-theme";

/**
 * The booking control for the funnel's checkout step.
 *
 * It wraps the same `bookClassAction` the signed-in app uses, so a seat
 * reserved here goes through exactly the checks, waitlisting and Stripe
 * hand-off as one reserved from /discover.
 *
 * It does not navigate on success, deliberately. A server action refreshes
 * the route it was called from, the book page then sees the new booking and
 * forwards to the confirmation itself. This form is unmounted by that same
 * re-render, so anything it tried to do afterwards would never run.
 */
export function BookForm({
  classId,
  isFull,
  priceLabel,
}: {
  classId: string;
  isFull: boolean;
  priceLabel: string;
}) {
  const [state, formAction, pending] = useActionState(
    bookClassAction,
    undefined,
  );

  return (
    <form
      action={formAction}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        borderRadius: 24,
        overflow: "hidden",
        border: `1.5px solid ${C.ink}`,
      }}
    >
      <input type="hidden" name="classId" value={classId} />
      {state && "error" in state && state.error && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: "12px 18px",
            background: "oklch(94% 0.06 25)",
            color: "oklch(38% 0.14 25)",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {state.error}
        </p>
      )}
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
          {isFull
            ? "We'll email you the moment a seat opens."
            : "Cancel free, any time, from your schedule."}
        </span>
        <span style={{ fontSize: 13, color: C.inkSoft, textWrap: "pretty" }}>
          {isFull
            ? "You keep your place in the queue until then, and you are not charged for a waitlist seat."
            : "Cancelling puts the seat back in the class. Paid classes are refunded to the card you used."}
        </span>
      </div>
    </form>
  );
}
