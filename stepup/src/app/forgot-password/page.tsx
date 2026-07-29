import Link from "next/link";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata = { title: "Reset your password — StepUp" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-sm flex-1 flex-col justify-center px-5 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center justify-center gap-2 text-2xl font-extrabold text-ink"
      >
        <span>🕺</span>
        <span>StepUp</span>
      </Link>

      <h1 className="text-center text-xl font-bold text-ink">Forgot your password?</h1>
      <p className="mt-1 text-center text-sm text-ink-soft">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <ForgotPasswordForm />

      <p className="mt-6 text-center text-sm text-ink-soft">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-brand">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
