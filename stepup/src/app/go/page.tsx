import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { ROLE_HOME } from "@/lib/roles";

/**
 * "Take me to my section." Signing in cannot name its own destination, the
 * role is only known once the credentials check has run, and Google's callback
 * knows even less, so every sign-in lands here and this dispatches on role.
 *
 * `/` used to do this job, which meant a signed-in user could never reach the
 * marketing page, the wordmark bounced them straight back to their dashboard.
 * Splitting the two lets `/` stay the marketing page for everyone.
 *
 * A page rather than a route handler, deliberately. A route handler's 307 is
 * followed for content but leaves the old path in the address bar when the
 * router is mid-navigation from a Server Action, which is exactly how sign-in
 * arrives here. A page's `redirect()` the router handles properly.
 */
export default async function Go() {
  const user = await getSessionUser();
  redirect(user ? ROLE_HOME[user.role] : "/login");
}
