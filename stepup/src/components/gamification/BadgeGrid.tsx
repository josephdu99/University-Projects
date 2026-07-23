import { clsx } from "clsx";
import { BADGE_CATALOG } from "@/lib/gamification";

export function BadgeGrid({ earnedCodes }: { earnedCodes: Set<string> }) {
  const badges = [...BADGE_CATALOG].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
      {badges.map((badge) => {
        const earned = earnedCodes.has(badge.code);
        return (
          <div
            key={badge.code}
            title={badge.description}
            className={clsx(
              "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-opacity",
              earned
                ? "border-gold/40 bg-gold/10"
                : "border-border bg-surface-muted opacity-40 grayscale"
            )}
          >
            <span className="text-3xl">{badge.emoji}</span>
            <span className="text-xs font-semibold leading-tight text-ink">
              {badge.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
