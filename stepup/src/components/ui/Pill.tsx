import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

export function Pill({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
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

export function Tag({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "brand" | "success" | "gold";
}) {
  const toneClasses = {
    neutral: "bg-surface-muted text-ink-soft",
    brand: "bg-brand-light text-brand-dark",
    success: "bg-success/10 text-success",
    gold: "bg-gold/15 text-gold",
  }[tone];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        toneClasses
      )}
    >
      {children}
    </span>
  );
}
