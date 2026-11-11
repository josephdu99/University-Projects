import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveBookingViewer } from "@/lib/guest-session";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { formatClassWhen, formatClassWhenLong } from "@/lib/time";
import { getPublicClass } from "@/lib/first-class-data";
import { FunnelPage, Wordmark } from "@/components/first-class/FunnelChrome";

export const metadata = { title: "You're booked, StepUp" };

/**
 * Step 6: the booking, confirmed.
 *
 * Every detail is read back off the real booking, so the page can only say
 * "you're booked" when a seat genuinely exists. Somebody who has not booked is
 * sent to the checkout step rather than shown a confirmation for nothing.
 */
export default async function BookedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);

  // Either a signed-in dancer or a guest on the link we emailed them.
  const [danceClass, viewer] = await Promise.all([
    getPublicClass(id),
    resolveBookingViewer(id, t),
  ]);
  if (!danceClass) notFound();
  if (!viewer) redirect(`/first-class/${id}/book`);
  const booking = viewer.booking;

  const waitlisted = booking.status === "WAITLISTED";
  const pending = booking.status === "PENDING_PAYMENT";
  const online = danceClass.format === "ONLINE";
  const first = viewer.name.split(" ")[0];
  const address =
    danceClass.location ?? danceClass.studio?.address ?? null;

  return (
    <FunnelPage>
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "20px clamp(20px, 5vw, 32px) 0",
          boxSizing: "border-box",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <Wordmark size={18} />
        </Link>
        {!viewer.isGuest && (
          <Link
            href="/schedule"
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: C.inkSoft,
              textDecoration: "none",
            }}
          >
            My classes
          </Link>
        )}
      </div>

      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "clamp(28px, 6vw, 56px) clamp(20px, 5vw, 32px) 72px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: waitlisted ? C.gold : C.heroBg,
              color: waitlisted ? C.ink : "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            {waitlisted ? "…" : "✓"}
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: "clamp(34px, 6.5vw, 68px)",
              lineHeight: 0.95,
              letterSpacing: "-0.045em",
            }}
          >
            {waitlisted
              ? `You're on the list, ${first}.`
              : pending
                ? `Nearly there, ${first}.`
                : `You're booked, ${first}.`}
          </h1>
          <p style={{ margin: 0, fontSize: 18, color: "oklch(40% 0.02 60)" }}>
            {danceClass.title} ·{" "}
            {formatClassWhenLong(danceClass.startTime, danceClass.timezone)}.
            {waitlisted
              ? ` You're number ${booking.waitlistPosition ?? 1} in the queue, and we'll email you the moment a seat opens.`
              : pending
                ? " Your seat is held while the payment goes through."
                : viewer.email
                  ? ` Confirmation sent to ${viewer.email}.`
                  : ""}
          </p>

          {!waitlisted && !pending && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {/* The real .ics route, which checks you hold a live booking. */}
              <a
                href={`/api/classes/${danceClass.id}/calendar`}
                style={{
                  fontWeight: 700,
                  fontSize: 16,
                  padding: "16px 24px",
                  borderRadius: 999,
                  background: C.ink,
                  color: C.heroCream,
                  textDecoration: "none",
                }}
              >
                Add to calendar
              </a>
              {!online && address && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    padding: "14px 22px",
                    borderRadius: 999,
                    border: `1.5px solid ${C.ink}`,
                    color: C.ink,
                    textDecoration: "none",
                  }}
                >
                  Get directions
                </a>
              )}
            </div>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
            gap: 12,
          }}
        >
          <Panel label={online ? "JOINING" : "GETTING THERE"}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18 }}>
                {danceClass.studio?.name ?? danceClass.hostName}
              </span>
              <span style={{ fontSize: 15, color: "oklch(42% 0.02 60)" }}>
                {online
                  ? "Online class. The joining link is on this page nearer the time."
                  : (address ?? "Address will be confirmed by the studio.")}
              </span>
            </div>
            <div style={{ fontSize: 15, color: "oklch(42% 0.02 60)" }}>
              {formatClassWhen(danceClass.startTime, danceClass.timezone)}
            </div>
          </Panel>

          {/* The handoff listed what to bring as fixed copy. These two lines
              are the ones that hold for any class; anything more specific is
              the host's to say, and there is no field for it yet. */}
          <Panel label="WHAT TO BRING">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                fontSize: 16,
              }}
            >
              <Numbered n="01">Clothes you can move in</Numbered>
              <Numbered n="02">
                {online ? "A space you can step around in" : "Shoes you can turn in, or socks"}
              </Numbered>
              <Numbered n="03">A water bottle</Numbered>
            </div>
          </Panel>
        </div>

        <div
          style={{
            padding: "clamp(20px, 4vw, 32px)",
            borderRadius: 28,
            background: C.ink,
            color: C.heroCream,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <span
            style={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: 26,
              letterSpacing: "-0.02em",
            }}
          >
            {viewer.isGuest
              ? "Want it in an account?"
              : "It's all in your schedule."}
          </span>
          <span style={{ fontSize: 15, color: "oklch(80% 0.02 70)" }}>
            {viewer.isGuest
              ? "Set a password and this booking, and every one after it, lives in one place. We'll email you the link, because that's the only way we can be sure the address is yours."
              : "Your booking, the joining details and the cancel button live in one place."}
          </span>
          <Link
            href={
              viewer.isGuest
                ? `/forgot-password${viewer.email ? `?email=${encodeURIComponent(viewer.email)}` : ""}`
                : "/schedule"
            }
            style={{
              alignSelf: "flex-start",
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: 17,
              padding: "16px 26px",
              borderRadius: 999,
              background: C.heroBg,
              color: "#fff",
              textDecoration: "none",
            }}
          >
            {viewer.isGuest ? "Set a password" : "Go to my classes"}
          </Link>
        </div>

        <Link
          href={`/first-class/${id}/before${viewer.token ? `?t=${encodeURIComponent(viewer.token)}` : ""}`}
          style={{
            alignSelf: "flex-start",
            fontWeight: 700,
            fontSize: 15,
            color: "oklch(55% 0.17 38)",
            textDecoration: "none",
          }}
        >
          What happens between now and class →
        </Link>
      </div>
    </FunnelPage>
  );
}

function Panel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: 24,
        borderRadius: 24,
        background: "oklch(99.5% 0.004 70)",
        border: "1px solid oklch(88% 0.01 70)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: "oklch(55% 0.17 38)",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function Numbered({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <span style={{ color: C.heroBg, fontWeight: 800 }}>{n}</span>
      {children}
    </div>
  );
}
