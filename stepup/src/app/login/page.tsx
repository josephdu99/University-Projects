import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { ROLE_HOME } from "@/lib/roles";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(ROLE_HOME[user.role]);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-sm flex-1 flex-col justify-center px-5 py-12">
      <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-2xl font-extrabold text-ink">
        <span>🕺</span>
        <span>StepUp</span>
      </Link>

      <h1 className="text-center text-xl font-bold text-ink">Welcome back</h1>
      <p className="mt-1 text-center text-sm text-ink-soft">
        Log in to book classes and keep your streak alive.
      </p>

      <LoginForm />

      <p className="mt-6 text-center text-sm text-ink-soft">
        New to StepUp?{" "}
        <Link href="/signup" className="font-semibold text-brand">
          Create an account
        </Link>
      </p>

      <div className="mt-8 rounded-2xl bg-surface-muted p-4 text-xs text-ink-soft">
        <p className="font-semibold text-ink">Demo accounts (password: password123)</p>
        <p className="mt-1">Dancer: alex@stepup.dance</p>
        <p>Studio owner: maria@rhythmroom.dance</p>
        <p>Independent instructor: jay@stepup.dance</p>
      </div>
    </div>
  );
}
