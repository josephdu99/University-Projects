import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveBookingViewer } from "@/lib/guest-session";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { formatClassWhenLong } from "@/lib/time";
import { hasStarted } from "@/lib/first-class";
import { getPublicClass } from "@/lib/first-class-data";
import {
  FunnelPage,
  Wordmark,
  Eyebrow,
} from "@/components/first-class/FunnelChrome";

export const metadata = { title: "Before your class, StepUp" };

function countdown(startTime: Date): string {
  const ms = startTime.getTime() - Date.now();
  if (ms <= 0) return "Happening now";
  const hours = Math.round(ms / 3_600_000);
  if (hours < 1) return "Less than an hour away";
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} away`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} away`;
}

/**
 * Step 7: the gap between booking and turning up, which is where the handoff
 * says beginners drop out.
 *
 * Its answer was three messages. Two of those are now real, sent by the
 * reminder job in `lib/reminders.ts`: one the evening before, one on the day.
 * The third, a personal text from the teacher on the morning, is not: there
 * is no SMS anywhere in the app and no way for a host to write one, so this
 * page says email rather than implying a text will arrive.
 *
 * The brief itself lives here, on a page the dancer can come back to,
 * built from the booking.
 */
export default async function BeforeClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);

  const [danceClass, viewer] = await Promise.all([
    getPublicClass(id),
    resolveBookingViewer(id, t),
  ]);
  if (!danceClass) notFound();
  if (!viewer) redirect(`/first-class/${id}/book`);

  const online = danceClass.format === "ONLINE";
  const address = danceClass.location ?? danceClass.studio?.address ?? null;
  const started = hasStarted(danceClass.startTime);

  return (
    <FunnelPage>
      <div
        style={{
          maxWidth: 880,
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
      </div>

      <div
        style={{
          maxWidth: 880,
          margin: "0 auto",
          padding: "clamp(28px, 6vw, 56px) clamp(20px, 5vw, 32px) 80px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 40,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Eyebrow>{countdown(danceClass.startTime).toUpperCase()}</Eyebrow>
          <h1
            style={{
              margin: 0,
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: "clamp(34px, 6vw, 68px)",
              lineHeight: 0.95,
              letterSpacing: "-0.045em",
              textWrap: "balance",
            }}
          >
            Everything you need before {danceClass.title}.
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 18,
              color: "oklch(40% 0.02 60)",
              maxWidth: "46ch",
            }}
          >
            {formatClassWhenLong(danceClass.startTime, danceClass.timezone)}.
            Nothing to prepare, just turn up.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
            gap: 14,
          }}
        >
          <Brief
            n="01"
            title={online ? "Where to join" : "Where to go"}
            body={
              online
                ? "This one is online. The joining link sits on your booking in My classes, and opens shortly before the start time."
                : (address ??
                  "The studio will confirm the address. It is on your booking in My classes.")
            }
          />
          <Brief
            n="02"
            title="When to arrive"
            body={
              online
                ? "Join a few minutes early so you are not setting up your screen while everyone starts."
                : "Aim for ten minutes early. That is enough to find the room, leave your bag and catch your breath."
            }
          />
          <Brief
            n="03"
            title="What to wear"
            body="Clothes you can move in, and shoes you can turn in. Socks are fine in most studios. Nothing special to buy."
          />
          <Brief
            n="04"
            title="Who else is there"
            body={
              danceClass.firstTimersBooked > 0
                ? `${danceClass.firstTimersBooked} of the people booked in ${danceClass.firstTimersBooked === 1 ? "has" : "have"} never danced here before either. Up to ${danceClass.capacity} in the room.`
                : `Up to ${danceClass.capacity} people in the room, and nobody is watching your feet but you.`
            }
          />
        </div>

        {/*
          What StepUp actually sends. Saying this plainly is better than the
          handoff's three-message sequence, which would be describing a
          reminder system that does not exist.
        */}
        <div
          style={{
            padding: "clamp(20px, 4vw, 32px)",
            borderRadius: 28,
            background: "oklch(99.5% 0.004 70)",
            border: `1px solid ${C.border}`,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <span
            style={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: "-0.02em",
            }}
          >
            What we send you
          </span>
          <p
            style={{
              margin: 0,
              fontSize: 16,
              color: "oklch(40% 0.02 60)",
              maxWidth: "60ch",
              textWrap: "pretty",
            }}
          >
            Three emails, and nothing else. Your confirmation when you book,
            a reminder the evening before, and one on the day. We don&apos;t
            text. Add the class to your calendar too and it will remind you
            itself.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <a
              href={`/api/classes/${danceClass.id}/calendar`}
              style={{
                fontWeight: 700,
                fontSize: 15,
                padding: "14px 22px",
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
                  fontSize: 15,
                  padding: "12px 20px",
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
        </div>

        <div
          style={{
            padding: "clamp(20px, 4vw, 28px)",
            borderRadius: 24,
            background: "oklch(94% 0.045 65)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18 }}>
            Can&apos;t make it after all?
          </span>
          <span
            style={{ fontSize: 15, color: "oklch(40% 0.02 60)", textWrap: "pretty" }}
          >
            Cancel from My classes and the seat goes straight back to the class,
            which matters when somebody is on the waitlist. Far better than not
            turning up.
          </span>
        </div>

        {started && (
          <Link
            href={`/first-class/${id}/after${viewer.token ? `?t=${encodeURIComponent(viewer.token)}` : ""}`}
            style={{
              alignSelf: "flex-start",
              fontWeight: 700,
              fontSize: 15,
              color: "oklch(55% 0.17 38)",
              textDecoration: "none",
            }}
          >
            Been to the class? Pick what&apos;s next →
          </Link>
        )}
      </div>
    </FunnelPage>
  );
}

function Brief({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
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
        gap: 8,
      }}
    >
      <span
        style={{
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: 14,
          color: C.heroBg,
        }}
      >
        {n}
      </span>
      <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 19 }}>
        {title}
      </span>
      <span
        style={{ fontSize: 15, color: "oklch(42% 0.02 60)", textWrap: "pretty" }}
      >
        {body}
      </span>
    </div>
  );
}
