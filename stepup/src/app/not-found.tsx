import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-24 text-center">
      <span className="text-5xl">🕺💨</span>
      <h1 className="text-2xl font-extrabold text-ink">Missed a step</h1>
      <p className="max-w-sm text-sm text-ink-soft">
        We couldn&apos;t find that page. Let&apos;s get you back on the floor.
      </p>
      <ButtonLink href="/">Back to StepUp</ButtonLink>
      <Link href="/discover" className="text-sm text-ink-soft underline">
        Or go to Discover
      </Link>
    </div>
  );
}
