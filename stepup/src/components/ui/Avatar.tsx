import { clsx } from "clsx";

const sizeClasses = {
  sm: "h-8 w-8 text-base",
  md: "h-11 w-11 text-xl",
  lg: "h-16 w-16 text-3xl",
  xl: "h-24 w-24 text-5xl",
};

export function Avatar({
  emoji,
  color,
  size = "md",
  className,
}: {
  emoji: string;
  color: string;
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-full",
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: `${color}22` }}
      aria-hidden
    >
      <span style={{ filter: "saturate(1.1)" }}>{emoji}</span>
    </div>
  );
}
