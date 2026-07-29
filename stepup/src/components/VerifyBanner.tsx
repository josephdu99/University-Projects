import Link from "next/link";

export function VerifyBanner({ verified }: { verified: boolean }) {
  if (verified) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3">
      <p className="text-sm text-ink">
        <span className="mr-1">📬</span>
        Confirm your email address to unlock booking and hosting.
      </p>
      <Link
        href="/verify-email"
        className="text-sm font-semibold text-brand underline"
      >
        Resend link
      </Link>
    </div>
  );
}
