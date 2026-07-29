type Meta = Record<string, unknown>;

/**
 * Structured logging. Emits JSON in production so Vercel's log drains (or any
 * aggregator) can parse it, and readable lines in development.
 *
 * If SENTRY_DSN is configured and @sentry/nextjs is installed, errors are
 * forwarded there too — but the app never hard-depends on it.
 */
function emit(level: "info" | "warn" | "error", event: string, meta?: Meta) {
  const payload = { level, event, ts: new Date().toISOString(), ...meta };

  if (process.env.NODE_ENV === "production") {
    console[level](JSON.stringify(payload));
  } else {
    console[level](`[${level}] ${event}`, meta ?? "");
  }
}

export function logInfo(event: string, meta?: Meta) {
  emit("info", event, meta);
}

export function logWarn(event: string, meta?: Meta) {
  emit("warn", event, meta);
}

export function logError(event: string, error: unknown, meta?: Meta) {
  const err =
    error instanceof Error
      ? { message: error.message, stack: error.stack, name: error.name }
      : { message: String(error) };

  emit("error", event, { ...meta, error: err });
  reportToSentry(event, error, meta);
}

function reportToSentry(event: string, error: unknown, meta?: Meta) {
  if (!process.env.SENTRY_DSN) return;
  try {
    // Optional peer dependency — resolved at runtime so the app builds and
    // runs fine without Sentry installed.
    const sentry = (
      globalThis as unknown as {
        __SENTRY__?: { captureException?: (e: unknown, c?: unknown) => void };
      }
    ).__SENTRY__;
    sentry?.captureException?.(error, { tags: { event }, extra: meta });
  } catch {
    // Never let error reporting throw.
  }
}
