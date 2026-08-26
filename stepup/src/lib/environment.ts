/**
 * Which deployment this process is.
 *
 * Vercel sets VERCEL_ENV to "production" only for the Production deployment;
 * every other build — the staging branch, PR previews — reports "preview".
 * APP_ENV overrides it, so a self-hosted or local run can label itself too.
 *
 * The point of this module is that nothing has to guess: search engines, the
 * environment ribbon, and the destructive scripts all read the same answer.
 */
export type AppEnv = "production" | "test" | "development";

export const APP_ENV: AppEnv = (() => {
  const explicit = process.env.APP_ENV?.toLowerCase();
  if (explicit === "production" || explicit === "test" || explicit === "development") {
    return explicit;
  }

  switch (process.env.VERCEL_ENV) {
    case "production":
      return "production";
    case "preview":
      return "test";
    default:
      return process.env.NODE_ENV === "production" ? "production" : "development";
  }
})();

export const isProduction = APP_ENV === "production";

/** Shown in the corner ribbon on anything that is not Production. */
export const ENV_LABEL: Record<AppEnv, string> = {
  production: "Production",
  test: "Test",
  development: "Local",
};

/**
 * Throws unless this process is pointed at a non-production database.
 *
 * Guards the destructive maintenance scripts. `--force` is the deliberate
 * escape hatch for the one time you really do mean production.
 */
export function assertNotProduction(task: string) {
  if (!isProduction) return;
  if (process.argv.includes("--force")) {
    console.warn(`⚠️  ${task}: running against PRODUCTION because --force was passed.`);
    return;
  }
  throw new Error(
    `${task} refused to run: APP_ENV/VERCEL_ENV says this is production.\n` +
      `Point DATABASE_URL at the Test database, or pass --force if you truly mean it.`
  );
}
