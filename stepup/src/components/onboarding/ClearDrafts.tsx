"use client";

import { useEffect } from "react";

/**
 * Forget a finished sign-up's saved draft, so the form starts empty next
 * time instead of offering to re-create an account that now exists.
 */
export function ClearDrafts({ keys }: { keys: string[] }) {
  useEffect(() => {
    for (const k of keys) {
      try {
        window.localStorage.removeItem(k);
      } catch {
        // Storage unavailable: nothing was saved there either.
      }
    }
  }, [keys]);
  return null;
}
