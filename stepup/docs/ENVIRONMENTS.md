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
| `DATABASE_URL` | the `staging` branch **pooled** string |
| `DATABASE_URL_UNPOOLED` | the `staging` branch **direct** string |
| `AUTH_SECRET` | a **different** secret from Production (`openssl rand -base64 32`) |
| `APP_ENV` | `test` |
| `SHOW_DEMO_LOGINS` | `true` — handy on Test, stays off in Production |
| `STRIPE_SECRET_KEY` | Stripe **test mode** key, if payments are on |
| `STRIPE_WEBHOOK_SECRET` | the test webhook's signing secret |
| `RESEND_API_KEY` | leave **unset** so Test emails print to the log instead of sending |

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
{ "status": "ok", "environment": "test", "databaseHost": "ep-…-staging-….neon.tech" }
```

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
