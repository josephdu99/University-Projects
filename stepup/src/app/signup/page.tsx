import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { ROLE_HOME } from "@/lib/roles";
import { SignUpForm } from "./SignUpForm";

export default async function SignUpPage() {
  const user = await getSessionUser();
  if (user) redirect(ROLE_HOME[user.role]);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
      <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-2xl font-extrabold text-ink">
        <span>🕺</span>
        <span>StepUp</span>
      </Link>

      <h1 className="text-center text-xl font-bold text-ink">Create your account</h1>
      <p className="mt-1 text-center text-sm text-ink-soft">
        One step — pick what brings you to StepUp.
      </p>

      <SignUpForm />

      <p className="mt-6 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand">
          Log in
        </Link>
      </p>
    </div>
  );
}
