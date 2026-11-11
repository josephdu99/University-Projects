import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { ROLE_HOME, SECTION_LABEL } from "@/lib/roles";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { formatClassWhen, formatMoney } from "@/lib/time";
import { getPublicClass } from "@/lib/first-class-data";
import { imageForStyle } from "@/lib/class-photo";
import { BookForm } from "@/components/first-class/BookForm";
import { FunnelPage, Wordmark } from "@/components/first-class/FunnelChrome";

export const metadata = { title: "Book your spot, StepUp" };

/**
 * Step 5 of the funnel.
 *
 * The handoff drew this as guest checkout, "no account needed", collecting a
 * name, an email and a card on the page. The app cannot honour that: a seat
 * belongs to a User, booking is gated on the STUDENT role, and money goes
 * through Stripe Checkout on a redirect rather than a card field we host.
 * Building a real guest path would mean new schema and a second payment
 * route, which is a bigger change than a redesign.
 *
 * So this keeps the step and its job, confirming what you are about to book
 * and taking one action to do it, and is honest about the account. Somebody
 * signed out gets the shortest route to a seat, with the class remembered
 * across signing up so they land straight back here.
 */
export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, danceClass] = await Promise.all([
    getSessionUser(),
    getPublicClass(id),
  ]);
  if (!danceClass) notFound();

  const seatsLeft = Math.max(0, danceClass.capacity - danceClass.seatsTaken);
  const isFull = seatsLeft === 0;
  const img = imageForStyle(danceClass.style);
  const priceLabel =
    danceClass.priceCents === 0
      ? "Free"
      : formatMoney(danceClass.priceCents, danceClass.currency);

  // Already holding a seat? Go straight to the confirmation rather than
  // offering to book it twice.
  //
  // This is also what completes the booking step: a server action refreshes
  // the route it was called from, so the moment `bookClassAction` succeeds
  // this page re-renders, finds the new booking and forwards to page 6. Doing
  // it here rather than pushing from the client is what makes it reliable,
  // the form unmounts in that same re-render, so an effect inside it would
  // never get the chance to navigate.
  const existing = user
    ? await db.booking.findUnique({
        where: { userId_classId: { userId: user.id, classId: id } },
        select: { status: true },
      })
    : null;
  if (existing && existing.status !== "CANCELLED") {
    redirect(`/first-class/${id}/booked`);
  }

  const next = encodeURIComponent(`/first-class/${id}/book`);

  return (
    <FunnelPage>
      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          padding: "20px clamp(20px, 5vw, 32px)",
          boxSizing: "border-box",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Link
          href={`/first-class/${id}`}
          style={{ fontWeight: 600, fontSize: 15, color: C.ink, textDecoration: "none" }}
        >
          ← Back to class
        </Link>
        <Link href="/" style={{ textDecoration: "none" }}>
          <Wordmark size={18} />
        </Link>
      </div>

      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          padding: "8px clamp(20px, 5vw, 32px) 64px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: "clamp(30px, 5vw, 46px)",
            lineHeight: 1,
            letterSpacing: "-0.04em",
          }}
        >
          Book your spot
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "72px minmax(0,1fr) auto",
            gap: 14,
            alignItems: "center",
            padding: 14,
            borderRadius: 22,
            background: "oklch(99.5% 0.004 70)",
            border: "1px solid oklch(88% 0.01 70)",
          }}
        >
          <Image
            src={img.src}
            alt=""
            width={144}
            height={144}
            sizes="72px"
            style={{ width: 72, height: 72, borderRadius: 14, objectFit: "cover" }}
          />
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 17 }}>
              {danceClass.title}
            </span>
            <span style={{ fontSize: 14, color: C.inkSoft }}>
              {formatClassWhen(danceClass.startTime, danceClass.timezone)} ·{" "}
              {danceClass.studio?.name ?? danceClass.hostName}
            </span>
          </div>
          <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 18 }}>
            {priceLabel}
          </span>
        </div>

        {!user ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                padding: "18px 20px",
                borderRadius: 20,
                background: "oklch(94% 0.045 65)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span
                style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 17 }}
              >
                One account, so the seat is yours.
              </span>
              <span style={{ fontSize: 15, color: "oklch(40% 0.02 60)", textWrap: "pretty" }}>
                A booking has to belong to someone, so the studio knows who is
                coming and you can cancel it later. It takes about a minute, and
                we&apos;ll bring you straight back here.
              </span>
            </div>
            <Link
              href={`/signup?next=${next}`}
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: 18,
                padding: "18px 28px",
                borderRadius: 999,
                background: C.heroBg,
                color: "#fff",
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              Create my account and book
            </Link>
            <Link
              href={`/login?next=${next}`}
              style={{
                fontWeight: 700,
                fontSize: 15,
                padding: "14px 22px",
                borderRadius: 999,
                border: `1.5px solid ${C.ink}`,
                color: C.ink,
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              I already have an account
            </Link>
          </div>
        ) : user.role !== "STUDENT" ? (
          <div
            style={{
              padding: "18px 20px",
              borderRadius: 20,
              background: "oklch(99.5% 0.004 70)",
              border: "1px solid oklch(88% 0.01 70)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 17 }}>
              This account hosts classes, it doesn&apos;t book them.
            </span>
            <span style={{ fontSize: 15, color: C.inkSoft }}>
              Seats are booked by dancer accounts. You can still see everything
              about this class.
            </span>
            <Link
              href={ROLE_HOME[user.role]}
              style={{
                alignSelf: "flex-start",
                fontWeight: 700,
                fontSize: 15,
                color: "oklch(55% 0.17 38)",
                textDecoration: "none",
              }}
            >
              Back to {SECTION_LABEL[user.role]} →
            </Link>
          </div>
        ) : (
          <BookForm
            classId={danceClass.id}
            isFull={isFull}
            priceLabel={priceLabel}
          />
        )}

        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "oklch(50% 0.02 60)",
            textWrap: "pretty",
          }}
        >
          {danceClass.priceCents === 0
            ? "This class is free, so there's nothing to pay."
            : "Payment is taken by Stripe on the next screen. StepUp never sees your card number."}
        </p>
      </div>
    </FunnelPage>
  );
}
