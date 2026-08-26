import type { Metric } from "@/lib/leaderboard";
import { EVERYWHERE, isMetric } from "@/lib/leaderboard";
import { getLeaderboard } from "@/lib/leaderboard-data";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { LeaderboardBoard } from "@/components/leaderboard/LeaderboardBoard";

export const metadata = { title: "Leaderboard · StepUp" };

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ metric?: string; city?: string }>;
}) {
  const sessionUser = await requireRole("STUDENT");
  const [params, viewer] = await Promise.all([
    searchParams,
    db.user.findUniqueOrThrow({
      where: { id: sessionUser.id },
      select: { id: true, timezone: true, homeCity: true },
    }),
  ]);

  const { rows, cities, viewerOptedIn } = await getLeaderboard(viewer);

  const metric: Metric = isMetric(params.metric) ? params.metric : "classes";

  // Default to the dancer's own city when there is a board for it — the
  // interesting comparison is the room they actually dance in.
  const requested = params.city;
  const city =
    requested && (requested === EVERYWHERE || cities.includes(requested))
      ? requested
      : viewer.homeCity && cities.includes(viewer.homeCity)
        ? viewer.homeCity
        : EVERYWHERE;

  return (
    <LeaderboardBoard
      rows={rows}
      cities={cities}
      initialMetric={metric}
      initialCity={city}
      viewerOptedIn={viewerOptedIn}
    />
  );
}
