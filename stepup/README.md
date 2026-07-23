# StepUp — dance classes, gamified

Strava for dance: dancers book classes at local studios or with independent
online instructors, then earn points, streaks, levels and badges for every
class they attend.

## Who it's for

- **Dancers** — discover in-person and online classes, book in one tap, and
  track progress on their profile.
- **Studios** — sign up, list a venue, publish classes, and check students in
  from a live roster.
- **Independent instructors** — no studio required; publish live online
  classes and build a following.

## Stack

- Next.js 16 (App Router, Server Actions, Turbopack)
- TypeScript, Tailwind CSS v4
- Prisma ORM 7 + SQLite (`better-sqlite3` driver adapter)
- Auth.js (NextAuth v5) with email/password credentials, JWT sessions

## Getting started

```bash
npm install
npx prisma migrate deploy   # create the SQLite database
npx tsx prisma/seed.ts      # seed demo studios, instructors, students & classes
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo accounts

Every seeded account uses the password `password123`.

| Role                   | Email                     |
| ----------------------- | ------------------------- |
| Dancer (rich history)   | alex@stepup.dance         |
| Dancer (new account)    | chris@stepup.dance        |
| Studio owner            | maria@rhythmroom.dance    |
| Studio owner            | diego@salsacasa.dance     |
| Studio owner            | elena@barrebeyond.dance   |
| Independent instructor  | jay@stepup.dance          |
| Independent instructor  | noor@stepup.dance         |

## How gamification works

See `src/lib/gamification.ts` for the full implementation.

- **Points** are awarded per class (set by the host) when a student is
  checked in (studio/instructor) or self-reports attendance for an online
  class after it has started.
- **Levels** are derived from lifetime points across ten named tiers.
- **Streaks** count consecutive ISO weeks with at least one attended class.
- **Badges** (10 total) are evaluated after every check-in — first class,
  attendance milestones, streak milestones, style/studio variety, and
  time-of-day badges (Early Bird / Night Owl).
- **Leaderboards** show all-time and rolling 7-day standings.

## Project structure

```
prisma/schema.prisma        Data model
prisma/seed.ts               Demo data (studios, instructors, students, classes)
src/lib/auth.ts              NextAuth credentials config
src/lib/gamification.ts      Points, levels, streaks, badges, leaderboards
src/lib/actions/             Server Actions (auth, booking, class creation, check-in)
src/app/(student)/           Discover, Schedule, Leaderboard, class detail
src/app/studio/               Studio owner dashboard + roster/check-in
src/app/teach/                 Independent instructor dashboard + roster
src/app/profile/              Shared profile (role-aware)
src/components/               UI primitives, nav shell, gamification widgets
```
