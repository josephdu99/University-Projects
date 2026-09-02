# Environments

Two deployments of the same codebase.

| | Production | Test |
|---|---|---|
| Git branch | `main` | `staging` |
| Vercel environment | Production | Preview |
| Database | the live Neon database | **a separate Neon branch** |
| Search engines | indexed | `noindex` + `robots.txt: Disallow /` |
| Corner ribbon | none | orange **TEST** badge, bottom-left |
| Stripe | live keys | test keys |
| Email | real Resend key | unset, so mail logs to the console |

The rule that makes this work: **nothing reaches Production except a merge of
`staging` into `main`.** Day-to-day work lands on `staging`, gets looked at on
the Test URL, and only then moves across.

---

## One-time setup

Steps 1–4 are in the Vercel and Neon dashboards. The repo side is already done —
the `staging` branch exists and matches `main`.

### 1. Give Test its own database

**Do not let Test share the Production database.** That is the single thing that
turns a test deployment into an outage.

Neon branching gives you a copy-on-write clone, so Test starts with exactly the
data Production has today and then diverges:

1. Vercel dashboard → **Storage** → open the Postgres store → **Open in Neon**.
2. In Neon: **Branches** → **New branch**.
   - Name it `staging`.
   - Parent: your production branch (usually `main`/`production`).
   - Include data: **yes** — this is what "everything Production has right now".
3. On the new branch, **Connection Details** → copy the **pooled** connection
   string, and the **unpooled/direct** one as well.

Neon branches are cheap and can be reset from the parent later, which is how you
refresh Test with current Production data.

### 2. Point the Preview environment at it

Vercel → project → **Settings → Environment Variables**. For each of these,
tick **Preview** only (leave Production alone):

| Variable | Value |
|---|---|
| `STAGING_DATABASE_URL` | the `staging` branch **pooled** string |
| `STAGING_DATABASE_URL_UNPOOLED` | the `staging` branch **direct** string |
| `AUTH_SECRET` | a **different** secret from Production (`openssl rand -base64 32`) |
| `APP_ENV` | `test` |
| `SHOW_DEMO_LOGINS` | `true` — handy on Test, stays off in Production |
| `STRIPE_SECRET_KEY` | Stripe **test mode** key, if payments are on |
| `STRIPE_WEBHOOK_SECRET` | the test webhook's signing secret |
| `RESEND_API_KEY` | leave **unset** so Test emails print to the log instead of sending |

The database variables are deliberately named `STAGING_*` rather than being
Preview-scoped copies of `DATABASE_URL`. The Neon–Vercel integration manages
`DATABASE_URL` across *all* environments, so overriding it per-environment is
fragile — the integration can rewrite it. Instead the code checks
`VERCEL_ENV === "preview"` and reads `STAGING_DATABASE_URL` /
`STAGING_DATABASE_URL_UNPOOLED` (see `src/lib/database-url.ts`), leaving the
integration's variables alone.

If a Preview deployment reaches that code and `STAGING_DATABASE_URL` is not
set, it **throws instead of falling back**. A build that fails loudly is much
better than a test deployment that quietly writes to the live database.

`AUTH_SECRET` differing is deliberate: it means a Test session cannot be
replayed against Production.

### 3. Give Test a stable URL

By default every push gets a new random preview URL. To get one address that
always shows the latest `staging`:

Vercel → **Settings → Domains** → **Add** → e.g. `test-stepup.vercel.app`
(or a subdomain you own) → set **Git Branch** to `staging`.

### 4. Check it landed

Open `https://<your-test-url>/api/health`. You should see:

```json
{
  "status": "ok",
  "environment": "test",
  "vercelEnv": "preview",
  "databaseHost": "ep-…-staging-….neon.tech"
}
```

`environment` is `APP_ENV` when you set it, otherwise it is derived from
`VERCEL_ENV` (`preview` → `test`). `vercelEnv` is the raw Vercel value, so you
can tell the two apart when they disagree.

Two things to confirm: `environment` says `test`, and `databaseHost` is **not**
the same host Production reports. If the hosts match, stop — Preview is still
pointed at the live database and step 2 did not take.

---

## Day to day

```bash
# work happens on staging
git checkout staging
git pull origin staging
# …changes…
git push origin staging          # → deploys to Test automatically

# once it looks right on the Test URL
git checkout main
git merge --ff-only staging
git push origin main             # → deploys to Production
```

`--ff-only` is intentional: it fails loudly if `main` has drifted, instead of
quietly creating a merge you did not intend.

**Promote from the dashboard only as a last resort.** Promoting a Preview
deployment to Production reuses the build that already exists, so
`vercel-build` never runs again — and neither does `prisma migrate deploy`.
Any migration in that change reaches the Test database and never the live
one, which surfaces as 500s on whichever page reads the new column. Merging
and letting Vercel build is what keeps schema and code in step.

### Refreshing Test with current Production data

In Neon: **Branches → `staging` → Reset from parent**. That discards whatever
Test accumulated and re-clones Production. Do it whenever Test data gets messy.

### Database migrations

`vercel-build` runs `prisma migrate deploy` on every deployment, so a new
migration applies to the Test database first, on the `staging` push. If it is
going to fail, it fails there — which is the whole point.

---

## What the code does about all this

- `src/lib/environment.ts` — resolves `APP_ENV` from `APP_ENV` or `VERCEL_ENV`.
  Everything else reads from here rather than sniffing env vars itself.
- `src/lib/database-url.ts` — the single place that decides *which database*.
  Preview reads `STAGING_DATABASE_URL(_UNPOOLED)`; Production and local dev read
  `DATABASE_URL(_UNPOOLED)`. Both the app (`src/lib/db.ts`) and migrations
  (`prisma.config.ts`) go through it, so they cannot disagree.
- `EnvironmentRibbon` — the orange **TEST** badge. Renders nothing in
  Production, so a screenshot of Test is never mistaken for the live site.
- `src/app/robots.ts` and the root `metadata.robots` — non-production
  deployments are `noindex` and disallow all crawling.
- `/api/health` — reports `environment` and `databaseHost` (host only, never
  credentials), so you can tell at a glance what a deployment is wired to.
- `assertNotProduction()` — the demo-data reset script refuses to run when it
  resolves to production unless you pass `--force`.

## Things worth knowing

- **Pull request previews still happen.** Any branch pushed to GitHub gets its
  own preview deployment, using the same Preview environment variables — so they
  share the Test database. Fine for looking at a change; do not treat a PR
  preview as an isolated environment.
- **Stripe webhooks are per-environment.** If you turn payments on for Test,
  add a second webhook endpoint in the Stripe dashboard pointing at the Test URL
  and use *its* signing secret. Reusing the Production secret will make
  signature checks fail.
- **Test still sends nothing by default.** With `RESEND_API_KEY` unset, the
  email layer logs the message instead of delivering it, so test signups cannot
  mail real people.

---

## Deployment log

Only entries where an environment was changed by hand, outside the `staging`
→ `main` flow above. A rollback that leaves no trace is the kind of thing
somebody rediscovers at the worst moment. Newest first.

### 1 Sep 2026 — the dancer redesign went to Production

The Test deployment was promoted to Production from the Vercel dashboard,
putting the rebuilt Discover, My classes, Leaderboard and Profile pages on
the live site. `main` was then fast-forwarded to `staging` (`7db301c`) so the
branch matches what is running, which is the normal flow — it just happened
after the fact rather than causing the deploy.

**Why the fast-forward was not optional.** Promoting reuses the build that
already exists; it does not re-run `vercel-build`, and therefore does not run
`prisma migrate deploy`. The promoted code reads `User.leaderboardOptIn`, a
column added by `20260826020000_add_leaderboard_opt_in`, which until now had
only ever been applied to the **staging** Neon branch. Pushing `main` triggers
a real Production build, which applies it to the live database.

If you promote a Preview deployment again, check both of these before calling
it done:

1. `GET /api/health` on the Production URL reports `"vercelEnv":"production"`
   and the Production `databaseHost` — **not** the staging one. A promoted
   build carrying Preview environment variables would resolve to
   `STAGING_DATABASE_URL` and serve the test database to real users.
2. `/leaderboard` and `/profile` load. They are the pages that touch the
   column the migration adds, so they are where an unapplied migration shows
   up first.

The safe order is the one in *Day to day* above: merge `staging` into `main`
and let Vercel build, rather than promoting an artifact.

### 29 Aug 2026 — database isolation restored

`e4cb73f` was cherry-picked back onto `staging`, so Test is no longer pointed
at the live database. `src/lib/database-url.ts` returns, and both the app and
`prisma migrate deploy` switch to `STAGING_DATABASE_URL` /
`STAGING_DATABASE_URL_UNPOOLED` whenever `VERCEL_ENV` is `preview` — the
Preview-scoped variables in step 2, which had been sitting inert since the
rollback below.

The `/leaderboard` rebuild (`efb0e3c`) was **not** brought back; Test still
runs the old points-ranked board, matching Production.

Two consequences worth expecting:

- **A Preview build now fails loudly if `STAGING_DATABASE_URL` is missing**,
  rather than falling back to `DATABASE_URL`. That is the point — the
  fallback is what wrote to live data — but it does mean a deploy that errors
  with *"VERCEL_ENV is \"preview\" but STAGING_DATABASE_URL is not set"* is
  telling you the Preview variable is not reaching the build, not that the
  code is broken.
- **The next Preview deploy migrates the staging Neon branch**, not
  Production. If that branch has drifted, **Reset from parent** first.

Confirm it took the way step 4 says: `databaseHost` on the Test
`/api/health` must not match Production's.

### 29 Aug 2026 — Test rolled back to the Production build

The Production build was manually redeployed onto the Test alias from the
Vercel dashboard, replacing the deployment that was there. Git was then
brought to the same state, so the branch matches what is actually running:
`staging` was rolled forward to the Production tree in `346fc41`, and
`git diff main staging` is now empty.

**Rolled off `staging`, both recoverable:**

| Commit | What it was |
|---|---|
| `efb0e3c` | The `/leaderboard` rebuild — attendance-ranked, opt-in, monthly. The old points-ranked board is what runs now. |
| `e4cb73f` | Preview database routing: `src/lib/database-url.ts`, which switched the app *and* `prisma migrate deploy` onto `STAGING_DATABASE_URL` when `VERCEL_ENV` was `preview`. |

```bash
git cherry-pick e4cb73f   # database isolation back, without the leaderboard
git cherry-pick efb0e3c   # the leaderboard back
```

**What this changed about isolation.** With `e4cb73f` gone, nothing in the
code looked at `VERCEL_ENV` to pick a database. Both the app and migrations
read `DATABASE_URL`, which the Neon–Vercel integration sets in every
environment — so Test was writing to live data. *(Undone by the entry above.)*

**Leftover in the Test database.** The staging Neon branch still has the
`leaderboardOptIn` column that `efb0e3c`'s migration added. Nothing reads it
now, so it is harmless; a **Reset from parent** clears it.
