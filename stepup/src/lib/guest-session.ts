import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { verifyToken, TOKEN_PURPOSE } from "@/lib/tokens";

export type BookingViewer = {
  userId: string;
  name: string;
  email: string | null;
  /** True when they got here on a guest link rather than a session. */
  isGuest: boolean;
  /** Set only for a guest, so pages can keep the link on their navigation. */
  token: string | null;
  booking: {
    status: string;
    waitlistPosition: number | null;
  };
};

/**
 * Who is looking at this booking, and are they allowed to?
 *
 * Two ways in: a signed-in dancer, or a guest holding the link we emailed
 * them. The token is checked against this class's booking specifically, so a
 * link for one booking cannot be pointed at another, and it is never turned
 * into a session, it only unlocks this page.
 */
export async function resolveBookingViewer(
  classId: string,
  token?: string,
): Promise<BookingViewer | null> {
  const session = await getSessionUser();

  if (session) {
    const booking = await db.booking.findUnique({
      where: { userId_classId: { userId: session.id, classId } },
      select: { status: true, waitlistPosition: true },
    });
    if (!booking || booking.status === "CANCELLED") return null;
    return {
      userId: session.id,
      name: session.name ?? "there",
      email: session.email ?? null,
      isGuest: false,
      token: null,
      booking,
    };
  }

  if (!token) return null;

  const check = await verifyToken(token, TOKEN_PURPOSE.GUEST_BOOKING);
  if (!check.valid) return null;

  const [user, booking] = await Promise.all([
    db.user.findUnique({
      where: { id: check.userId },
      select: { name: true, email: true, passwordHash: true, suspendedAt: true },
    }),
    db.booking.findUnique({
      where: { userId_classId: { userId: check.userId, classId } },
      select: { status: true, waitlistPosition: true },
    }),
  ]);

  if (!user || user.suspendedAt) return null;
  if (!booking || booking.status === "CANCELLED") return null;

  return {
    userId: check.userId,
    name: user.name,
    email: user.email,
    // Somebody who has since set a password is a real account holder. The
    // link still shows them their booking, but the page stops offering to
    // create an account they already have.
    isGuest: user.passwordHash === null,
    token,
    booking,
  };
}
