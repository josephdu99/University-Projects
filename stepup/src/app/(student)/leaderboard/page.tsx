import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getGlobalLeaderboard, getWeeklyLeaderboard } from "@/lib/gamification";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Pill";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await requireRole("STUDENT");
  const { period } = await searchParams;
  const isWeekly = period === "weekly";

  const [global, weekly] = await Promise.all([
    getGlobalLeaderboard(),
    getWeeklyLeaderboard(),
  ]);

  const rows = isWeekly
    ? weekly.map((r) => ({ userId: r.userId, points: r.points, user: r.user }))
    : global.map((r) => ({ userId: r.userId, points: r.totalPoints, user: r.user }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Leaderboard</h1>
        <p className="text-sm text-ink-soft">See who&apos;s putting in the work.</p>
      </div>

      <div className="flex gap-2">
        <Link href="/leaderboard">
          <Tag tone={isWeekly ? "neutral" : "brand"}>All-time</Tag>
        </Link>
        <Link href="/leaderboard?period=weekly">
          <Tag tone={isWeekly ? "brand" : "neutral"}>This week</Tag>
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-6 text-center text-sm text-ink-soft">
          No points on the board yet — be the first!
        </p>
      ) : (
        <Card className="divide-y divide-border">
          {rows.map((row, i) => (
            <div
              key={row.userId}
              className={`flex items-center gap-3 px-4 py-3 ${
                row.userId === user.id ? "bg-brand-light/40" : ""
              }`}
            >
              <span className="w-7 text-center text-sm font-bold text-ink-soft">
                {MEDALS[i] ?? i + 1}
              </span>
              <Avatar emoji={row.user.avatarEmoji} color={row.user.avatarColor} size="sm" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink">
                  {row.user.name}
                  {row.userId === user.id && (
                    <span className="ml-1.5 text-xs font-normal text-brand">(you)</span>
                  )}
                </p>
                {row.user.homeCity && (
                  <p className="text-xs text-ink-soft">{row.user.homeCity}</p>
                )}
              </div>
              <span className="text-sm font-bold text-ink">{row.points.toLocaleString()} pts</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
