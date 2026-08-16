"use client";

import { useEffect, useState } from "react";

/**
 * Animates a number up from zero on mount.
 *
 * State starts at the final value so the server-rendered HTML carries the real
 * figure — without JS, or with animation turned off, the number is simply
 * correct rather than stuck at zero. The climb is driven by rAF over a fixed
 * duration rather than the mockup's fixed increment, so it lands exactly on the
 * target whether that target is 17 or 17,000.
 */
export function CountUp({
  to,
  durationMs = 900,
  suffix = "",
}: {
  to: number;
  durationMs?: number;
  suffix?: string;
}) {
  const [value, setValue] = useState(to);

  useEffect(() => {
    if (to <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(to * progress));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    // No explicit reset to zero — the first frame's progress rounds to it
    // anyway, and setting state synchronously here would cascade a render.
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [to, durationMs]);

  return (
    <>
      {value.toLocaleString()}
      {suffix}
    </>
  );
}
