"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A form draft kept in localStorage, so a half-filled sign-up survives a
 * reload or a wander off to check an ABN. The same pattern as the matcher's
 * answers: storage is the store, read through useSyncExternalStore, so there
 * is one copy of the draft and no effect that copies it into state.
 *
 * Passwords and photos never go in here; callers keep those in plain state.
 */
export function createStoredDraft<T extends object>(
  key: string,
  empty: T,
  parse: (stored: unknown) => T,
) {
  const listeners = new Set<() => void>();
  let fallback: T | null = null;
  let cache: { raw: string; value: T } | null = null;

  function read(): T {
    if (fallback) return fallback;
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      return empty;
    }
    if (raw === null) return empty;
    if (cache?.raw === raw) return cache.value;
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Corrupt or not ours: start again.
    }
    cache = { raw, value: parse(parsed) };
    return cache.value;
  }

  function write(next: T | null) {
    try {
      if (next === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, JSON.stringify(next));
      fallback = null;
    } catch {
      fallback = next;
    }
    listeners.forEach((l) => l());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", listener);
    };
  }

  return function useStoredDraft() {
    const value = useSyncExternalStore(subscribe, read, () => empty);
    const update = useCallback((patch: Partial<T>) => write({ ...read(), ...patch }), []);
    const clear = useCallback(() => write(null), []);
    return [value, update, clear] as const;
  };
}

/** Narrowing helpers for parsing stored drafts defensively. */
export const str = (v: unknown, max = 600) => (typeof v === "string" ? v.slice(0, max) : "");
export const strs = (v: unknown, allowed: readonly string[]) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && allowed.includes(x)) : [];
