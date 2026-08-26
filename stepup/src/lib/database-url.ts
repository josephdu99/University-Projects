/**
 * Which database this process talks to.
 *
 * There are two Neon databases behind one codebase: the live one, and a
 * `staging` branch of it. Vercel sets `VERCEL_ENV="preview"` for every
 * deployment that is not Production — the `staging` branch and every PR
 * preview — so that is the signal used to switch.
 *
 * On Preview the Preview-scoped `STAGING_DATABASE_URL` /
 * `STAGING_DATABASE_URL_UNPOOLED` win. Production and local development are
 * untouched and keep reading `DATABASE_URL` / `DATABASE_URL_UNPOOLED`.
 *
 * Both the running app (`src/lib/db.ts`) and the migration runner
 * (`prisma.config.ts`, which `vercel-build` invokes via `prisma migrate
 * deploy`) resolve through here, so a preview build can never apply
 * migrations to the live database.
 */
export const isPreviewDeployment = process.env.VERCEL_ENV === "preview";

/**
 * Pooled connection string — what the request-handling app uses.
 *
 * On Preview a missing `STAGING_DATABASE_URL` throws rather than silently
 * falling back to `DATABASE_URL`: the Neon–Vercel integration sets
 * `DATABASE_URL` for *all* environments, so a quiet fallback would point the
 * test deployment straight at production data. Failing the build is the
 * safer failure.
 */
export function resolveDatabaseUrl(): string | undefined {
  if (isPreviewDeployment) {
    if (!process.env.STAGING_DATABASE_URL) {
      throw new Error(
        "VERCEL_ENV is \"preview\" but STAGING_DATABASE_URL is not set. " +
          "Add it in Vercel → Settings → Environment Variables, scoped to Preview, " +
          "pointing at the staging Neon branch. Refusing to fall back to DATABASE_URL, " +
          "which is the production database."
      );
    }
    return process.env.STAGING_DATABASE_URL;
  }

  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL
  );
}

/**
 * Direct (non-pooled) connection string — what migrations use.
 *
 * Pooled/pgbouncer connections don't reliably support the advisory locks
 * Prisma Migrate needs, so the unpooled string is preferred wherever one is
 * available, falling back to the pooled one when it isn't.
 */
export function resolveMigrationUrl(): string | undefined {
  if (isPreviewDeployment) {
    return process.env.STAGING_DATABASE_URL_UNPOOLED ?? resolveDatabaseUrl();
  }

  return (
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.POSTGRES_URL_NON_POOLING ??
    resolveDatabaseUrl()
  );
}

/**
 * Host of the connection string in use — never the credentials in it.
 * Safe to return from `/api/health`.
 */
export function databaseHost(): string {
  let url: string | undefined;
  try {
    url = resolveDatabaseUrl();
  } catch {
    return "misconfigured";
  }
  if (!url) return "unset";
  try {
    return new URL(url).host;
  } catch {
    return "unparseable";
  }
}
