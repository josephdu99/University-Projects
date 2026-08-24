import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { GOOGLE_ENABLED } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/roles";
import { googleLoginAction } from "@/lib/actions/auth-actions";
import {
  C,
  DISPLAY,
  marketingFontClass,
} from "@/lib/marketing-theme";
import { LoginForm } from "./LoginForm";
import { EnergyPanel } from "./EnergyPanel";

export const metadata = {
  title: "Log in — StepUp",
  description: "Log in to book your next dance class on StepUp.",
};

/**
 * The seeded demo logins are useful while showing the app to someone and a
 * liability on a public page otherwise, so they are off unless explicitly
 * switched on. Set SHOW_DEMO_LOGINS=true to bring the panel back.
 */
const SHOW_DEMO_LOGINS = process.env.SHOW_DEMO_LOGINS === "true";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(ROLE_HOME[user.role]);

  // The mockup's panel showed a live-looking "dancers logged in today" ticker
  // and a round 2,400+ figure. Both were invented, and a counter that climbs on
  // a timer is a straight-up fabrication, so these are real counts instead —
  // and each one is omitted while it would read as zero.
  const [dancerCount, classCount, demoAccount] = await Promise.all([
    db.user.count({ where: { role: "STUDENT", suspendedAt: null } }),
    db.danceClass.count(),
    // Only looked up when the panel could actually render, and it still needs
    // the seeded accounts to exist — reset-demo-data.ts removes it either way.
    SHOW_DEMO_LOGINS
      ? db.user.findUnique({
          where: { email: "alex@stepup.dance" },
          select: { id: true },
        })
      : null,
  ]);

  const stats = [
    dancerCount > 0 && {
      value: dancerCount.toLocaleString(),
      label: dancerCount === 1 ? "dancer on StepUp" : "dancers on StepUp",
    },
    classCount > 0 && {
      value: classCount.toLocaleString(),
      label: classCount === 1 ? "class hosted" : "classes hosted",
    },
  ].filter((s): s is { value: string; label: string } => Boolean(s));

  return (
    <div
      className={marketingFontClass}
      style={{
        fontFamily: "var(--font-body), sans-serif",
        background: C.bg,
        color: C.ink,
        lineHeight: 1.5,
        minHeight: "100vh",
        display: "flex",
        flexWrap: "wrap",
      }}
    >
      <EnergyPanel stats={stats} />

      {/* RIGHT — the form */}
      <div
        style={{
          flex: "1 1 460px",
          minWidth: 280,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "20px clamp(20px, 5vw, 48px)",
          }}
        >
          <div style={{ fontSize: 14, color: C.inkSoft }}>
            New to StepUp?{" "}
            <Link
              href="/signup"
              style={{ fontWeight: 700, color: C.brand, textDecoration: "none" }}
            >
              Create an account
            </Link>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px clamp(20px, 5vw, 24px) 64px",
          }}
        >
          <div style={{ width: "100%", maxWidth: 380 }}>
            <h1
              style={{
                fontFamily: DISPLAY,
                fontWeight: 800,
                fontSize: "clamp(26px, 4.5vw, 30px)",
                letterSpacing: "-0.02em",
                margin: "0 0 8px",
              }}
            >
              Welcome back.
            </h1>
            <p style={{ fontSize: 15, color: C.inkSoft, margin: "0 0 32px" }}>
              Log in to book your next class and keep your streak going.
            </p>

            <LoginForm />

            {GOOGLE_ENABLED && (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    margin: "20px 0",
                  }}
                >
                  <div
                    style={{ flex: 1, height: 1, background: C.border }}
                  />
                  <div style={{ fontSize: 12.5, color: "oklch(55% 0.02 60)" }}>
                    OR
                  </div>
                  <div
                    style={{ flex: 1, height: 1, background: C.border }}
                  />
                </div>

                <form action={googleLoginAction}>
                  <button
                    type="submit"
                    style={{
                      width: "100%",
                      padding: 13,
                      border: `1.5px solid ${C.borderSoft}`,
                      borderRadius: 999,
                      background: C.card,
                      fontWeight: 600,
                      fontSize: 15,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      color: C.inkBody,
                    }}
                  >
                    <GoogleMark />
                    Continue with Google
                  </button>
                </form>
              </>
            )}

            <div
              style={{
                fontSize: 12.5,
                color: "oklch(50% 0.02 60)",
                textAlign: "center",
                marginTop: 24,
              }}
            >
              By logging in you agree to StepUp&apos;s{" "}
              <Link href="/legal/terms" style={{ color: C.brand }}>
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/legal/privacy" style={{ color: C.brand }}>
                Privacy Policy
              </Link>
              .
            </div>

            {demoAccount && (
              <div
                style={{
                  marginTop: 28,
                  background: C.bgAlt,
                  border: `1px solid ${C.border}`,
                  borderRadius: 16,
                  padding: 16,
                  fontSize: 12.5,
                  color: C.inkSoft,
                }}
              >
                <p
                  style={{
                    margin: "0 0 6px",
                    fontWeight: 700,
                    color: C.ink,
                  }}
                >
                  Demo accounts (password: DemoPassw0rd!)
                </p>
                <p style={{ margin: 0 }}>Dancer: alex@stepup.dance</p>
                <p style={{ margin: 0 }}>
                  Studio owner: maria@rhythmroom.dance
                </p>
                <p style={{ margin: 0 }}>
                  Independent instructor: jay@stepup.dance
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.6 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.31-4.74 3.31-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.29-2.65l-3.57-2.77c-.99.66-2.26 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A10.99 10.99 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
