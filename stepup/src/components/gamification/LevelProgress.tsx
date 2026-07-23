import { getLevelInfo } from "@/lib/gamification";

export function LevelProgress({ points }: { points: number }) {
  const level = getLevelInfo(points);
  const percent = Math.round(level.progress * 100);

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Level {level.levelNumber}
          </p>
          <p className="text-lg font-bold text-ink">{level.name}</p>
        </div>
        <p className="text-sm font-medium text-ink-soft">
          {level.points.toLocaleString()} pts
          {level.nextThreshold !== null && (
            <span> · {(level.nextThreshold - level.points).toLocaleString()} to {level.nextName}</span>
          )}
        </p>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand to-gold transition-all"
          style={{ width: `${Math.max(6, percent)}%` }}
        />
      </div>
    </div>
  );
}
