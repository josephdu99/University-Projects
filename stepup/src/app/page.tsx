import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { ROLE_HOME } from "@/lib/roles";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default async function Home() {
  const user = await getSessionUser();
  if (user) redirect(ROLE_HOME[user.role]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 sm:px-6">
        <div className="flex items-center gap-2 text-lg font-extrabold text-ink">
          <span className="text-2xl">🕺</span>
          StepUp
        </div>
        <div className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost" size="sm">
            Log in
          </ButtonLink>
          <ButtonLink href="/signup" size="sm">
            Sign up
          </ButtonLink>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-5 pb-16 pt-8 text-center sm:px-6">
        <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Dance more. Track everything.
          <br />
          <span className="text-brand">Level up every class.</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-ink-soft">
          Book classes at local studios or online with independent instructors,
          earn points and badges, and climb the leaderboard with every session.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href="/signup" size="lg">
            Get started — it&apos;s free
          </ButtonLink>
          <ButtonLink href="/login" variant="secondary" size="lg">
            I have an account
          </ButtonLink>
        </div>

        <div className="mt-16 grid w-full gap-4 text-left sm:grid-cols-3">
          <Card className="p-5">
            <p className="text-2xl">💃</p>
            <p className="mt-2 font-bold text-ink">For dancers</p>
            <p className="mt-1 text-sm text-ink-soft">
              Discover classes near you or online, book in one tap, and never
              lose your streak.
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-2xl">🏢</p>
            <p className="mt-2 font-bold text-ink">For studios</p>
            <p className="mt-1 text-sm text-ink-soft">
              List your classes, fill your rosters, and check students in with
              a single tap.
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-2xl">🎥</p>
            <p className="mt-2 font-bold text-ink">For independent instructors</p>
            <p className="mt-1 text-sm text-ink-soft">
              No studio? No problem. Host live online classes and build your
              own following.
            </p>
          </Card>
        </div>

        <Link href="/login" className="mt-10 text-sm text-ink-soft underline">
          View demo accounts
        </Link>
      </main>
    </div>
  );
}
