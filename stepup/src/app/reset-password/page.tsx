import Link from "next/link";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

export const metadata = { title: "Choose a new password, StepUp" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col justify-center px-5 py-16">
        <Card className="flex flex-col items-center gap-4 p-8 text-center">
          <span className="text-5xl">⚠️</span>
          <h1 className="text-xl font-bold text-ink">Missing reset link</h1>
          <p className="text-sm text-ink-soft">
            Open the link from your email, or request a new one.
          </p>
          <ButtonLink href="/forgot-password">Request a new link</ButtonLink>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-sm flex-1 flex-col justify-center px-5 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center justify-center gap-2 text-2xl font-extrabold text-ink"
      >
        <span>🕺</span>
        <span>StepUp</span>
      </Link>

      <h1 className="text-center text-xl font-bold text-ink">Choose a new password</h1>
      <ResetPasswordForm token={token} />
    </div>
  );
}
