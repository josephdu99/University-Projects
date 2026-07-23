import Link from "next/link";
import { clsx } from "clsx";
import type { ComponentProps } from "react";

export function PillLink({
  active,
  className,
  ...props
}: ComponentProps<typeof Link> & { active?: boolean }) {
  return (
    <Link
      className={clsx(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
        active
          ? "border-brand bg-brand text-white"
          : "border-border bg-surface text-ink-soft hover:border-ink-soft",
        className
      )}
      {...props}
    />
  );
}
