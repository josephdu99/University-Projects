import { notFound } from "next/navigation";
import { requireStudioAccess } from "@/lib/studio-access";
import { classSheet } from "@/lib/studio-data";
import { SignInSheet } from "@/components/studio/SignInSheet";

export const metadata = { title: "Sign-in sheet, StepUp" };

export default async function PrintSignInPage({ params }: { params: Promise<{ id: string }> }) {
  const { studio } = await requireStudioAccess();
  const { id } = await params;
  const s = await classSheet(id, studio.ownerId);
  if (!s) notFound();
  return <SignInSheet s={s} auto />;
}
