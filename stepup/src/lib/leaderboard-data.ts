import { db } from "@/lib/db";
import { avatarHue, initialsOf } from "@/lib/style-chips";
import { monthBoundsInTimeZone } from "@/lib/time";
import type { BoardRow } from "@/lib/leaderboard";

/**
 * The board's one database query, kept apart from src/lib/leaderboard.ts so
 * the pure ranking helpers can be imported by the client component without
 * dragging Prisma into the browser bundle.
 */

/** How many dancers are pulled back for one board. */
const MAX_ROWS = 200;

type Aggregate = {
  id: string;
  name: string;
  displayName: string | null;
  homeCity: string | null;
  leaderboardOptIn: boolean;
  classes: number;
  styles: number;
};

export type LeaderboardData = {
  rows: BoardRow[];
  cities: string[];
  /** Instant the current month rolls over, in the viewer's zone. */
  periodEndsAt: Date;
  viewerOptedIn: boolean;
};

export async function getLeaderboard(viewer: {
  id: string;
  timezone: string;
}): Promise<LeaderboardData> {
  const { start, end } = monthBoundsInTimeZone(new Date(), viewer.timezone);

  // Aggregated in the database: this scales with dancers who attended
  // something this month, not with the whole attendance history.
  const aggregates = await db.$queryRaw<Aggregate[]>`
    SELECT u."id"                              AS "id",
           u."name"                            AS "name",
           u."displayName"                     AS "displayName",
           u."homeCity"                        AS "homeCity",
           u."leaderboardOptIn"                AS "leaderboardOptIn",
           COUNT(b."id")::int                  AS "classes",
           COUNT(DISTINCT c."style")::int      AS "styles"
    FROM "User" u
    JOIN "Booking" b    ON b."userId" = u."id"
                       AND b."status" = 'ATTENDED'
                       AND b."attendedAt" >= ${start}
                       AND b."attendedAt" <  ${end}
    JOIN "DanceClass" c ON c."id" = b."classId"
    WHERE u."role" = 'STUDENT'
      AND u."suspendedAt" IS NULL
      AND (u."leaderboardOptIn" = true OR u."id" = ${viewer.id})
    GROUP BY u."id", u."name", u."displayName", u."homeCity", u."leaderboardOptIn"
    ORDER BY "classes" DESC, u."name" ASC
    LIMIT ${MAX_ROWS}
  `;

  const rows: BoardRow[] = aggregates.map((a) => {
    const name = a.displayName ?? a.name;
    return {
      userId: a.id,
      name,
      initials: initialsOf(name),
      hue: avatarHue(a.id),
      city: a.homeCity,
      classes: a.classes,
      styles: a.styles,
      isViewer: a.id === viewer.id,
      privateToViewer: a.id === viewer.id && !a.leaderboardOptIn,
    };
  });

  const cities = [...new Set(rows.flatMap((r) => (r.city ? [r.city] : [])))].sort(
    (a, b) => a.localeCompare(b)
  );

  const viewerRow = rows.find((r) => r.isViewer);

  return {
    rows,
    cities,
    periodEndsAt: end,
    viewerOptedIn: viewerRow ? !viewerRow.privateToViewer : false,
  };
}

