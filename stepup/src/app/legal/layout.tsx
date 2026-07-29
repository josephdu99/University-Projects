import Link from "next/link";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-extrabold text-ink"
          >
            <span className="text-2xl">🕺</span>
            StepUp
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/legal/terms" className="text-ink-soft hover:text-ink">
              Terms
            </Link>
            <Link href="/legal/privacy" className="text-ink-soft hover:text-ink">
              Privacy
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-6">
        <article className="prose-stepup flex flex-col gap-4 text-sm leading-relaxed text-ink-soft">
          {children}
        </article>
      </main>
    </div>
  );
}
