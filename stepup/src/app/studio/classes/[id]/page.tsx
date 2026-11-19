import { redirect } from "next/navigation";

/** A class's page on the dashboard is its class sheet, opened in the Studio tab. */
export default async function StudioClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/studio?class=${encodeURIComponent(id)}#class-sheet`);
}
