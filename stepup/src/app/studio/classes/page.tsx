import { redirect } from "next/navigation";

/** Classes live on the Studio tab now: upcoming, then past. */
export default function StudioClassesPage() {
  redirect("/studio");
}
