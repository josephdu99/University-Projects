import { redirect } from "next/navigation";

/**
 * Creating a class happens in the studio dashboard now, in the page. This
 * address stays so old links and "Run again" keep working: it opens the
 * dashboard with the form showing, filled from the class being repeated.
 */
export default async function StudioNewClassPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  redirect(from ? `/studio?create=1&from=${encodeURIComponent(from)}` : "/studio?create=1");
}
