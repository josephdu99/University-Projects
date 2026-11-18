import { redirect } from "next/navigation";

/**
 * The standalone results page is retired: results now sit under the
 * questions on /start and update as they are answered. Older links, and any
 * bookmarks to a set of results, land on the matcher with their answers
 * carried over, rather than on a 404.
 */
export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const keep = new URLSearchParams();
  for (const key of ["goals", "music", "where", "when"]) {
    const v = params[key];
    if (typeof v === "string" && v) keep.set(key, v);
  }
  const qs = keep.toString();
  redirect(qs ? `/start?${qs}` : "/start");
}
