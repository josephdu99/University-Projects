# StepUp — dance classes, gamified

Strava for dance: dancers book classes at local studios or with independent
online instructors, then earn points, streaks, levels and badges for every
class they attend.

## Who it's for

- **Dancers** — discover in-person and online classes, book in one tap, join
  waitlists, and track progress on their profile.
- **Studios** — list a venue, publish one-off or weekly recurring classes,
  take payment, and check students in from a live roster.
- **Independent instructors** — no studio required; host live online classes
  and get paid directly.
- **Admins** — moderate users and studios, fix support cases, audit actions.

## Stack

- Next.js 16 (App Router, Server Actions, Turbopack)
- TypeScript, Tailwind CSS v4
- Prisma ORM 7 + PostgreSQL (`pg` driver adapter)
- Auth.js (NextAuth v5), email/password with JWT sessions
- Stripe Connect (Express) for marketplace payments
- Vitest for unit tests

## Getting started

You need a Postgres database — Vercel Postgres, Neon, Supabase, or a local
instance all work.

```bash
npm install                 # also generates the Prisma client (postinstall)
```

Create `.env`:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
AUTH_SECRET="<openssl rand -base64 32>"

# Optional — the app runs without these, with the features degraded:
RESEND_API_KEY=""           # unset: emails are logged to the console instead
EMAIL_FROM="StepUp <onboarding@resend.dev>"
STRIPE_SECRET_KEY=""        # unset: paid classes can't be created
STRIPE_WEBHOOK_SECRET=""
PLATFORM_FEE_PERCENT="10"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
SENTRY_DSN=""               # unset: errors log as structured JSON only
```

```bash
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo accounts

Password for every seeded account: `DemoPassw0rd!`

| Role                   | Email                     |
| ---------------------- | ------------------------- |
| Admin                  | admin@stepup.dance        |
| Dancer (rich history)  | alex@stepup.dance         |
| Dancer (new account)   | chris@stepup.dance        |
| Studio owner           | maria@rhythmroom.dance    |
| Studio owner           | diego@salsacasa.dance     |
| Studio owner           | elena@barrebeyond.dance   |
| Independent instructor | jay@stepup.dance          |
| Independent instructor | noor@stepup.dance         |

## Testing

```bash
npm test          # unit tests — no database required
npm run lint
npx tsc --noEmit
```

Concurrency and timezone guarantees need a real database, so they live in a
separate script:

```bash
DATABASE_URL="postgresql://…" npx tsx prisma/seed.ts
DATABASE_URL="postgresql://…" npx tsx scripts/verify-integration.ts
```

It asserts that a class can't be oversold by simultaneous bookings, that a
double-submitted check-in awards points once, and that waitlist positions stay
contiguous. Point it only at a disposable database.

## How gamification works

See `src/lib/gamification-rules.ts` (pure logic) and `src/lib/gamification.ts`
(persistence).

- **Points** are awarded per class when a host checks a student in, or when a
  student enters the host's check-in code for an online class.
- **Levels** derive from lifetime points across ten named tiers.
- **Streaks** count consecutive ISO weeks *in the dancer's own timezone*.
- **Badges** (10) are evaluated after every check-in — milestones, streaks,
  style/studio variety, and time-of-day badges based on the class's local
  wall-clock hour.
Points have no monetary value and can be adjusted by an admin when misuse is
detected. They are a private progress marker on a dancer's own profile —
**nobody is publicly ranked on them.**

### The leaderboard

`/leaderboard` (`src/lib/leaderboard.ts`, `src/lib/leaderboard-data.ts`) is
deliberately not a points board:

- **Ranked on attendance.** Classes danced, or distinct styles explored —
  things the dancer actually did. Never on spend.
- **Monthly.** Only the current calendar month counts, measured in the
  dancer's own timezone, so a long-tenured account cannot sit on top forever.
- **Opt-in.** `User.leaderboardOptIn` defaults to `false`; a dancer only
  appears once they turn it on at `/profile#visibility`. The viewer always
  sees their own row, marked "Only visible to you" while they are hidden.
- **Invisible to hosts.** The route is STUDENT-only, so a studio cannot look
  up where its dancers place.
- **Ties share a rank** (1, 2, 2, 4), displayed alphabetically.

Metric and city are client-side switches over one server-ranked payload and
are mirrored into the URL, so a view is shareable and survives a refresh.

## Notes on correctness

A few things that are easy to get wrong and are handled deliberately:

- **Timezones.** Class times are stored as UTC instants alongside the IANA
  zone they were scheduled in. A studio entering "6pm" means 6pm *locally*,
  which is a different instant depending on daylight saving. Times are
  rendered in the viewer's own zone. Weekly series regenerate from local
  wall-clock time, so a 7pm class stays at 7pm across a DST transition.
- **Overbooking.** Booking takes a Postgres advisory lock scoped to the class,
  so the capacity check and the insert are atomic. Serializable isolation also
  prevents the race but aborts losing transactions, which would show real users
  an error instead of a waitlist place.
- **Double check-ins.** Attendance flips status via a conditional `updateMany`
  guarded on the previous state, so a double-tapped button awards points once.
- **Payments.** Bookings for paid classes stay `PENDING_PAYMENT` until Stripe's
  webhook confirms, and every webhook event id is recorded so retried
  deliveries don't double-apply.
- **Account enumeration.** Password reset returns the same message whether or
  not the address exists, and login compares against a dummy hash for unknown
  users so response timing doesn't leak membership.

## Deploying (Vercel)

1. Import the repo into a Vercel project.
2. Add a Postgres database from the Storage tab. Neon/Vercel populate
   `DATABASE_URL` and `DATABASE_URL_UNPOOLED`, which the app and migrations
   pick up automatically. Preview deployments use a separate Neon branch via
   `STAGING_DATABASE_URL` / `STAGING_DATABASE_URL_UNPOOLED` — see
   [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md).
3. Add `AUTH_SECRET`, and the Stripe/Resend variables if you want payments and
   real email.
4. Deploy. `vercel-build` runs `prisma migrate deploy` on every deploy, so the
   schema stays in sync. Seeding is deliberately *not* automatic.
5. Point a Stripe webhook at `https://<your-domain>/api/stripe/webhook` for the
   events `checkout.session.completed`, `checkout.session.expired`,
   `payment_intent.payment_failed` and `account.updated`, then set
   `STRIPE_WEBHOOK_SECRET`.

`GET /api/health` returns 200 with database latency, or 503 if the database is
unreachable — suitable for an uptime check.

### Before real customers

```bash
DATABASE_URL="<production>" npx tsx prisma/reset-demo-data.ts --dry-run
DATABASE_URL="<production>" npx tsx prisma/reset-demo-data.ts
```

This removes the seeded demo accounts and their classes, leaving real accounts
untouched. It refuses to run if completed payments are attached to them.

**Also required before launch:** the Terms of Service and Privacy Policy in
`src/app/legal/` are drafted templates with placeholders for your legal entity,
ABN and contact addresses. Have a lawyer review them and fill those in.

## Project structure

```
prisma/schema.prisma          Data model
prisma/seed.ts                Demo data (refuses to run on real-looking data)
prisma/reset-demo-data.ts     Removes demo rows from a deployed database
scripts/verify-integration.ts Concurrency + timezone checks against real Postgres
src/lib/time.ts               Timezone-correct conversion and formatting
src/lib/gamification-rules.ts Pure scoring logic (unit tested)
src/lib/gamification.ts       Attendance, streaks, badge persistence
src/lib/booking.ts            Atomic seat reservation and waitlist
src/lib/stripe.ts             Connect onboarding, checkout, webhooks, refunds
src/lib/email.ts              Pluggable transactional email
src/lib/tokens.ts             Hashed, single-use verification/reset tokens
src/lib/rate-limit.ts         Database-backed sliding-window limiter
src/lib/actions/              Server Actions (auth, classes, payouts, admin)
src/app/(student)/            Discover, Schedule, Leaderboard, class detail
src/app/studio/ · /teach/     Host dashboards + roster/check-in
src/app/admin/                Moderation and support tooling
src/app/legal/                Terms and Privacy (templates)
tests/                        Vitest unit tests
```
