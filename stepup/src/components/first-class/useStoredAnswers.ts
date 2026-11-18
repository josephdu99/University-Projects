"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  ANSWERS_STORAGE_KEY,
  EMPTY_ANSWERS,
  answersFromStored,
  type Answers,
} from "@/lib/first-class";

/**
 * The matcher's answers, kept in localStorage as the handoff specifies and
 * read through useSyncExternalStore.
 *
 * Making storage the store, rather than copying it into React state after
 * mount, means there is one copy of the answers and no effect that sets
 * state. The server renders with the answers from the URL, if any; once
 * hydrated, the page shows what this browser saved, and changes made in
 * another tab arrive through the `storage` event.
 */

const listeners = new Set<() => void>();

// Set when storage refuses a write (private browsing, a full quota), so the
// page keeps working for this visit with the answers held in memory.
let fallback: Answers | null = null;
let cache: { raw: string; value: Answers } | null = null;

function read(): Answers {
  if (fallback) return fallback;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(ANSWERS_STORAGE_KEY);
  } catch {
    return EMPTY_ANSWERS;
  }
  if (raw === null) return EMPTY_ANSWERS;
  // Same string, same object: useSyncExternalStore needs a stable snapshot.
  if (cache?.raw === raw) return cache.value;

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Not ours, or corrupt: treated as no answers.
  }
  cache = { raw, value: answersFromStored(parsed) };
  return cache.value;
}

function write(next: Answers) {
  try {
    window.localStorage.setItem(ANSWERS_STORAGE_KEY, JSON.stringify(next));
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

/**
 * `fromUrl` is answers carried in the link, from an older results URL. When
 * present they win over what was saved, are written to storage once, and the
 * query string is dropped, so a reload shows the latest answers rather than
 * re-applying the link's.
 */
export function useStoredAnswers(fromUrl: Answers | null) {
  const answers = useSyncExternalStore(
    subscribe,
    read,
    () => fromUrl ?? EMPTY_ANSWERS,
  );

  useEffect(() => {
    if (!fromUrl) return;
    write(fromUrl);
    window.history.replaceState(null, "", window.location.pathname);
  }, [fromUrl]);

  // Reads the latest answers rather than closing over a render's copy, so two
  // quick changes cannot overwrite each other.
  const update = useCallback(
    (patch: Partial<Answers>) => write({ ...read(), ...patch }),
    [],
  );

  return [answers, update] as const;
}
