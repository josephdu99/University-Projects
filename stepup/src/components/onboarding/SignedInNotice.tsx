import Link from "next/link";
import { C } from "@/lib/marketing-theme";
import { ROLE_HOME, ROLE_LABEL, SECTION_LABEL, type Role } from "@/lib/roles";
import { logoutToAction } from "@/lib/actions/auth-actions";
import { Lede, PageTitle } from "./fields";

/**
 * Shown on a sign-up page to someone already logged in. Making a second
 * account from inside the first would quietly swap who they are signed in
 * as, so they choose: go back, or log out and carry on here.
 */
export function SignedInNotice({
  user,
  here,
  what,
}: {
  user: { name?: string | null; email?: string | null; role: Role };
  /** This page's path, to come back to after logging out. */
  here: string;
  /** "sign up a studio", "register to teach" … */
  what: string;
}) {
  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "clamp(24px, 5vw, 56px) clamp(20px, 5vw, 48px) 96px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <PageTitle size="clamp(32px, 5vw, 48px)">You&apos;re logged in already.</PageTitle>
      <Lede>
        You&apos;re logged in as {user.name ?? user.email} ({ROLE_LABEL[user.role]}). To {what},
        log out first and make a new account for it.
      </Lede>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <form action={logoutToAction}>
          <input type="hidden" name="next" value={here} />
          <button
            type="submit"
            className="su-btn su-dark-pill"
            style={{
              border: 0,
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 16,
              padding: "16px 24px",
              borderRadius: 999,
              background: C.ink,
              color: "oklch(96% 0.025 75)",
            }}
          >
            Log out and carry on
          </button>
        </form>
        <Link
          href={ROLE_HOME[user.role]}
          className="stepup-text-link"
          style={{ fontWeight: 700, fontSize: 15, color: C.ink }}
        >
          Back to {SECTION_LABEL[user.role]}
        </Link>
      </div>
    </div>
  );
}
