/**
 * Integration checks that need a real Postgres instance — the guarantees here
 * can't be proven with unit tests because they're about database concurrency.
 *
 * Run against a seeded, disposable database:
 *   DATABASE_URL="postgresql://…" npx tsx prisma/seed.ts
 *   DATABASE_URL="postgresql://…" npx tsx scripts/verify-integration.ts
 *
 * Covers:
 *   - timezone values survive a round trip through the database
 *   - a class can't be oversold by concurrent bookings
 *   - waitlist positions stay contiguous through promotion and cancellation
 *   - a double-submitted check-in awards points exactly once
 *
 * Never point this at production: it creates and deletes probe records.
 */
import { db } from "../src/lib/db";
import { reserveSeat, releaseSeat, countSeats } from "../src/lib/booking";
import { recordAttendance } from "../src/lib/gamification";
import { hourInTimeZone, zonedDateTimeToUtc } from "../src/lib/time";

let failures = 0;
function check(label: string, cond: boolean, detail = "") {
  console.log(`${cond ? "OK  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
}

async function main() {
  // ── Seed sanity ──────────────────────────────────────────────────────────
  const alex = await db.user.findUniqueOrThrow({
    where: { email: "alex@stepup.dance" },
    include: { profile: true, badges: { include: { badge: true } } },
  });
  const codes = alex.badges.map((b) => b.badge.code).sort();

  check("Alex has a 6-week streak", alex.profile?.currentStreak === 6, `got ${alex.profile?.currentStreak}`);
  check("Alex attended 6 classes", alex.profile?.classesTaken === 6, `got ${alex.profile?.classesTaken}`);
  check("Alex earned Early Bird", codes.includes("EARLY_BIRD"));
  check("Alex earned Night Owl", codes.includes("NIGHT_OWL"));
  check("Alex earned Style Explorer", codes.includes("STYLE_EXPLORER"));
  check("Alex earned Social Butterfly", codes.includes("SOCIAL_BUTTERFLY"));
  check("Alex earned On a Roll", codes.includes("STREAK_3"));
  console.log(`     badges: ${codes.join(", ")}\n     points: ${alex.profile?.totalPoints}`);

  // ── Timezone round-trip through the database ─────────────────────────────
  const sunrise = await db.danceClass.findFirstOrThrow({
    where: { title: "Sunrise Contemporary" },
  });
  const localHour = hourInTimeZone(sunrise.startTime, sunrise.timezone);
  check("7am class stored/read as 7am local", localHour === 7, `local hour ${localHour}, UTC hour ${sunrise.startTime.getUTCHours()}`);
  check("...and is NOT 7 in UTC (proves conversion happened)", sunrise.startTime.getUTCHours() !== 7);

  const salsa = await db.danceClass.findFirstOrThrow({ where: { title: "Salsa Night" } });
  check("9pm class reads as 21 local", hourInTimeZone(salsa.startTime, salsa.timezone) === 21);

  // ── Overbooking race ─────────────────────────────────────────────────────
  const maria = await db.user.findUniqueOrThrow({ where: { email: "maria@rhythmroom.dance" } });

  const tiny = await db.danceClass.create({
    data: {
      title: "Race Test", style: "Test", description: "concurrency probe",
      format: "ONLINE", onlineLink: "https://example.com",
      timezone: "Australia/Sydney",
      startTime: zonedDateTimeToUtc("2026-12-01", "18:00", "Australia/Sydney"),
      capacity: 1, points: 10, hostId: maria.id,
    },
  });

  const racers = await Promise.all(
    ["r1", "r2", "r3", "r4", "r5"].map((tag, i) =>
      db.user.create({
        data: {
          email: `race-${tag}-${Date.now()}@test.local`,
          name: `Racer ${i}`, role: "STUDENT",
          passwordHash: "x", profile: { create: {} },
        },
      })
    )
  );

  // Five people hit "Book" on a 1-seat class at the same instant.
  const outcomes = await Promise.all(
    racers.map((u) =>
      reserveSeat({ userId: u.id, classId: tiny.id, requiresPayment: false })
        .catch((e) => ({ ok: false as const, reason: String(e) }))
    )
  );

  const booked = outcomes.filter((o) => o.ok && "status" in o && o.status === "BOOKED");
  const waitlisted = outcomes.filter((o) => o.ok && "status" in o && o.status === "WAITLISTED");
  const seats = await countSeats(tiny.id);

  check("exactly 1 of 5 concurrent bookers got the seat", booked.length === 1, `booked=${booked.length}`);
  check("the other 4 were waitlisted", waitlisted.length === 4, `waitlisted=${waitlisted.length}`);
  check("class is not oversold", seats.taken === 1, `seats taken=${seats.taken}`);

  const positions = (
    await db.booking.findMany({
      where: { classId: tiny.id, status: "WAITLISTED" },
      select: { waitlistPosition: true },
      orderBy: { waitlistPosition: "asc" },
    })
  ).map((b) => b.waitlistPosition);
  check("waitlist positions are unique and sequential",
    JSON.stringify(positions) === JSON.stringify([1, 2, 3, 4]), JSON.stringify(positions));

  // ── Waitlist promotion ───────────────────────────────────────────────────
  const seatHolder = await db.booking.findFirstOrThrow({
    where: { classId: tiny.id, status: "BOOKED" },
  });
  const { promoted } = await releaseSeat(seatHolder.id);
  check("cancelling promotes the next person", promoted !== null);
  const afterSeats = await countSeats(tiny.id);
  check("class still has exactly 1 seat filled after promotion", afterSeats.taken === 1, `taken=${afterSeats.taken}`);

  const reindexed = (
    await db.booking.findMany({
      where: { classId: tiny.id, status: "WAITLISTED" },
      select: { waitlistPosition: true },
      orderBy: { waitlistPosition: "asc" },
    })
  ).map((b) => b.waitlistPosition);
  check("waitlist re-indexes after promotion",
    JSON.stringify(reindexed) === JSON.stringify([1, 2, 3]), JSON.stringify(reindexed));

  // Cancelling from the *middle* of the waitlist must not renumber the person
  // at position 1 down to 0.
  const middle = await db.booking.findFirstOrThrow({
    where: { classId: tiny.id, status: "WAITLISTED", waitlistPosition: 2 },
  });
  await releaseSeat(middle.id);
  const afterMiddle = (
    await db.booking.findMany({
      where: { classId: tiny.id, status: "WAITLISTED" },
      select: { waitlistPosition: true },
      orderBy: { waitlistPosition: "asc" },
    })
  ).map((b) => b.waitlistPosition);
  check("cancelling mid-waitlist keeps positions 1-based and contiguous",
    JSON.stringify(afterMiddle) === JSON.stringify([1, 2]), JSON.stringify(afterMiddle));

  // ── Double-points race ───────────────────────────────────────────────────
  const past = await db.danceClass.create({
    data: {
      title: "Double Points Probe", style: "Test", description: "idempotency probe",
      format: "ONLINE", onlineLink: "https://example.com",
      timezone: "Australia/Sydney",
      startTime: zonedDateTimeToUtc("2026-01-05", "18:00", "Australia/Sydney"),
      capacity: 10, points: 40, hostId: maria.id,
    },
  });
  // A dedicated fresh dancer, so the first-class badge bonus is deterministic
  // regardless of how many times this script has run.
  const probe = await db.user.create({
    data: {
      email: `probe-${Date.now()}@test.local`,
      name: "Probe Dancer",
      role: "STUDENT",
      passwordHash: "x",
      profile: { create: {} },
    },
  });
  const booking = await db.booking.create({
    data: { userId: probe.id, classId: past.id },
  });

  const before = await db.gamificationProfile.findUniqueOrThrow({ where: { userId: probe.id } });

  // Simulate a double-clicked check-in button.
  const results = await Promise.all([
    recordAttendance(booking.id).catch((e) => ({ ok: false as const, reason: String(e) })),
    recordAttendance(booking.id).catch((e) => ({ ok: false as const, reason: String(e) })),
    recordAttendance(booking.id).catch((e) => ({ ok: false as const, reason: String(e) })),
  ]);

  const after = await db.gamificationProfile.findUniqueOrThrow({ where: { userId: probe.id } });
  const gained = after.totalPoints - before.totalPoints;
  const awardedOnce = results.filter((r) => r.ok && "alreadyAttended" in r && r.alreadyAttended === false).length;

  // 40 class points + 25 first-class badge bonus = 65, counted once.
  check("triple check-in awards points only once", gained === 65, `gained ${gained} (expected 65)`);
  check("only one call reported a fresh attendance", awardedOnce === 1, `got ${awardedOnce}`);
  check("classesTaken incremented once", after.classesTaken - before.classesTaken === 1);

  // ── Cleanup probes ───────────────────────────────────────────────────────
  await db.booking.deleteMany({ where: { classId: { in: [tiny.id, past.id] } } });
  await db.danceClass.deleteMany({ where: { id: { in: [tiny.id, past.id] } } });
  await db.user.deleteMany({ where: { id: { in: [...racers.map((r) => r.id), probe.id] } } });

  console.log(failures === 0 ? "\nALL INTEGRATION CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().finally(() => db.$disconnect());
