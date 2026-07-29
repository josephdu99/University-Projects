import Link from "next/link";
import { verifyEmailAction } from "@/lib/actions/auth-actions";
import { getSessionUser } from "@/lib/session";
import { ROLE_HOME } from "@/lib/roles";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { ResendVerification } from "./ResendVerification";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const user = await getSessionUser();

  // Arriving from the emailed link: consume the token and report the outcome.
  if (token) {
    const result = await verifyEmailAction(token);
    const ok = Boolean(result?.success);

    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col justify-center px-5 py-16">
        <Card className="flex flex-col items-center gap-4 p-8 text-center">
          <span className="text-5xl">{ok ? "✅" : "⚠️"}</span>
          <h1 className="text-xl font-bold text-ink">
            {ok ? "Email confirmed" : "We couldn't confirm that"}
          </h1>
          <p className="text-sm text-ink-soft">
            {ok
              ? "Your account is fully set up — you're ready to book classes."
              : result?.error}
          </p>
          {ok ? (
            <ButtonLink href={user ? ROLE_HOME[user.role] : "/login"}>
              {user ? "Continue" : "Log in"}
            </ButtonLink>
          ) : (
            user && <ResendVerification />
          )}
        </Card>
      </div>
    );
  }

  // Landing here directly: offer to resend.
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col justify-center px-5 py-16">
      <Card className="flex flex-col items-center gap-4 p-8 text-center">
        <span className="text-5xl">📬</span>
        <h1 className="text-xl font-bold text-ink">Confirm your email</h1>
        <p className="text-sm text-ink-soft">
          {user
            ? `We sent a confirmation link to ${user.email}. Click it to unlock booking and hosting.`
            : "Open the link we emailed you to confirm your address."}
        </p>
        {user ? (
          <ResendVerification />
        ) : (
          <Link href="/login" className="text-sm font-semibold text-brand">
            Back to log in
          </Link>
        )}
      </Card>
    </div>
  );
}
