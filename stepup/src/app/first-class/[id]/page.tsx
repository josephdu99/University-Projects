import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { ROLE_HOME, SECTION_LABEL, LEVEL_LABEL } from "@/lib/roles";
import { C, DISPLAY } from "@/lib/marketing-theme";
import {
  formatClassWhen,
  formatClassWhenLong,
  formatDuration,
  formatMoney,
} from "@/lib/time";
import { opennessOf, OPENNESS_LABEL } from "@/lib/first-class";
import { getPublicClass } from "@/lib/first-class-data";
import {
  FunnelPage,
  FunnelHeader,
  FunnelFooter,
} from "@/components/first-class/FunnelChrome";
import { classImage } from "@/lib/class-photo";
import { partnerTag } from "@/lib/class-form";
import { roleLimitsOf } from "@/lib/booking";
import { scaleLabel } from "@/lib/levels";
import { nextTermStart } from "@/lib/listing";
import { cutoffLabel } from "@/lib/policy-copy";
import { neededChip } from "@/lib/partner-roles";
import { toFormFields } from "@/lib/time";
import { RolesCard, PolicyCard, CourseCard } from "@/components/first-class/ClassExtras";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await db.danceClass.findUnique({
    where: { id },
    select: { title: true, style: true },
  });
  return {
    title: c ? `${c.title}, StepUp` : "Class, StepUp",
    description: c ? `A beginner-friendly ${c.style} class on StepUp.` : undefined,
  };
}

/**
 * Step 4: the class itself, readable without an account.
 *
 * The handoff filled this page with per-class editorial a host has no field
 * for: a teacher's quote, what to wear, a minute-by-minute run sheet, a star
 * rating out of 132 reviews. Rather than invent those, everything here is
 * derived from what the class record actually holds, and the host's own
 * description carries the voice the quote was doing.
 */
export default async function FirstClassPage({
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

  const home = user ? ROLE_HOME[user.role] : null;
  const homeLabel = user ? SECTION_LABEL[user.role] : null;
  const openness = opennessOf(danceClass.level);
  const seatsLeft = Math.max(0, danceClass.capacity - danceClass.seatsTaken);
  const img = classImage({
    style: danceClass.style,
    photoUrl: danceClass.photoUrl,
    studioName: danceClass.studio?.name,
  });
  const online = danceClass.format === "ONLINE";
  const partner = partnerTag(danceClass.partner);

  // "Pick a night": the other upcoming sessions of this same series, which is
  // the only place in the schema where one class genuinely repeats.
  const siblings = danceClass.seriesId
    ? await db.danceClass.findMany({
        where: {
          seriesId: danceClass.seriesId,
          startTime: { gte: new Date() },
          cancelledAt: null,
        },
        orderBy: { startTime: "asc" },
        take: 4,
        select: {
          id: true,
          startTime: true,
          timezone: true,
          capacity: true,
          _count: {
            select: {
              bookings: {
                where: { status: { in: ["BOOKED", "ATTENDED", "PENDING_PAYMENT"] } },
              },
            },
          },
        },
      })
    : [];

  const bookHref = `/first-class/${danceClass.id}/book`;
  const limits = roleLimitsOf(danceClass);
  const isCourse = danceClass.listing === "COURSE";
  const isTrial = danceClass.listing === "TRIAL";
  const tz = danceClass.timezone;
  const courseStarted = isCourse && Boolean(danceClass.series && danceClass.series.startsOn.getTime() <= Date.now());
  const coursePrice = danceClass.series?.coursePriceCents ?? 0;
  const weeks = danceClass.series?.courseWeeks ?? 0;
  const priceLine = isTrial
    ? "Free trial"
    : isCourse
      ? `${coursePrice ? formatMoney(coursePrice, danceClass.currency).replace(/\.00$/, "") : "Free"} for ${weeks} weeks`
      : danceClass.priceCents === 0
        ? "Free"
        : formatMoney(danceClass.priceCents, danceClass.currency);
  const dayLabel = (d: Date) => formatClassWhen(d, tz).split(" · ")[0];
  const nextTermLabel = (startsOn: Date, w: number | null) =>
    w ? dayLabel(new Date(`${nextTermStart(toFormFields(startsOn, tz).date, w)}T12:00:00Z`)) : null;

  // "Also at {studio}": the studio's course in this style (or any course),
  // open for enrolment or running now with a next term to wait for.
  const course =
    danceClass.studio && !isCourse
      ? await db.classSeries.findFirst({
          where: {
            studioId: danceClass.studio.id,
            listing: "COURSE",
            endsOn: { gte: new Date() },
            kids: false,
          },
          orderBy: [{ startsOn: "asc" }],
          select: {
            id: true,
            title: true,
            style: true,
            startsOn: true,
            courseWeeks: true,
            coursePriceCents: true,
            currency: true,
            sessions: { where: { cancelledAt: null }, orderBy: { startTime: "asc" }, take: 1, select: { id: true } },
          },
        })
      : null;

  return (
    <FunnelPage>
      <div style={{ paddingBottom: 120 }}>
        <FunnelHeader home={home} homeLabel={homeLabel} width={880} compact />

        {/* Back to the matcher, which restores its answers from storage. */}
        <div
          style={{
            maxWidth: 880,
            margin: "0 auto",
            padding: "0 clamp(20px, 5vw, 40px) 16px",
            boxSizing: "border-box",
          }}
        >
          <Link
            href="/start"
            className="stepup-text-link"
            style={{ fontWeight: 600, fontSize: 15, color: C.ink, textDecoration: "none" }}
          >
            ← Your matches
          </Link>
        </div>

        <div
          style={{
            maxWidth: 880,
            margin: "0 auto",
            padding: "0 clamp(20px, 5vw, 40px)",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(32px, 6vw, 64px)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <Image
              src={img.src}
              alt={img.alt}
              width={1408}
              height={768}
              priority
              unoptimized={img.uploaded}
              sizes="(max-width: 920px) 92vw, 840px"
              style={{
                display: "block",
                width: "100%",
                aspectRatio: "16/9",
                objectFit: "cover",
                borderRadius: 28,
              }}
            />
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {openness && (
                <span
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: C.heroBg,
                    color: "#fff",
                    whiteSpace: "nowrap",
                  }}
                >
                  {OPENNESS_LABEL[openness]}
                </span>
              )}
              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: "oklch(99.5% 0.004 70)",
                  border: "1px solid oklch(86% 0.01 70)",
                  whiteSpace: "nowrap",
                }}
              >
                {online ? "Online, join from home" : "In person"}
              </span>
              {[
                isTrial ? "Free trial" : isCourse ? `Course · ${weeks} weeks` : null,
                scaleLabel(danceClass.level),
                limits ? "Partner class · no partner needed" : partner,
                limits && limits.rule !== "NONE" ? neededChip(danceClass.roles) : null,
              ]
                .filter((x): x is string => Boolean(x))
                .map((label) => (
                  <span
                    key={label}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      background: "oklch(99.5% 0.004 70)",
                      border: "1px solid oklch(86% 0.01 70)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </span>
                ))}
              {danceClass.firstTimersBooked > 0 && (
                <span
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: "oklch(92% 0.06 150)",
                    color: "oklch(35% 0.1 150)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {danceClass.firstTimersBooked} booked in{" "}
                  {danceClass.firstTimersBooked === 1 ? "has" : "have"} never
                  danced here
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <h1
                style={{
                  margin: 0,
                  fontFamily: DISPLAY,
                  fontWeight: 800,
                  fontSize: "clamp(34px, 6vw, 64px)",
                  lineHeight: 0.95,
                  letterSpacing: "-0.045em",
                }}
              >
                {danceClass.title}
              </h1>
              <div style={{ fontSize: 17, color: "oklch(42% 0.02 60)" }}>
                {danceClass.studio?.name ?? danceClass.hostName}
                {danceClass.studio?.city ? ` · ${danceClass.studio.city}` : ""}
                {danceClass.studio && danceClass.teacherMember ? ` · with ${danceClass.teacherName}` : ""} ·{" "}
                {formatDuration(danceClass.durationMin)}
              </div>
            </div>
          </div>

          {/* The teacher, in their own words: the note to first-timers they
              wrote on their profile, or else the class's own description. */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto minmax(0,1fr)",
              gap: 20,
              alignItems: "center",
              padding: 24,
              borderRadius: 28,
              background: C.ink,
              color: C.heroCream,
            }}
          >
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: "50%",
                background: C.heroBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: DISPLAY,
                fontWeight: 800,
                fontSize: 34,
                color: "#fff",
              }}
            >
              {danceClass.teacherPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- an uploaded photo, already resized
                <img
                  src={danceClass.teacherPhotoUrl}
                  alt=""
                  style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                danceClass.teacherName.charAt(0).toUpperCase()
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  color: "oklch(78% 0.12 50)",
                }}
              >
                YOUR TEACHER · {danceClass.teacherName.toUpperCase()}
              </div>
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: "clamp(18px, 2.4vw, 26px)",
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                  textWrap: "pretty",
                }}
              >
                {danceClass.teacherNote
                  ? `“${danceClass.teacherNote}”`
                  : danceClass.plan
                    ? `A First Timer ${danceClass.style} class. It assumes nobody in the room has danced before.`
                    : danceClass.description}
              </div>
            </div>
          </div>

          {/* What to expect, every card from a real field. */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <h2
              style={{
                margin: 0,
                fontFamily: DISPLAY,
                fontWeight: 800,
                fontSize: "clamp(24px, 3.5vw, 40px)",
                letterSpacing: "-0.03em",
              }}
            >
              What to expect
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
                gap: 12,
              }}
            >
              <ExpectCard
                label="WHEN"
                value={formatClassWhen(danceClass.startTime, danceClass.timezone)}
                note={formatClassWhenLong(danceClass.startTime, danceClass.timezone)}
              />
              <ExpectCard
                label={online ? "WHERE" : "WHERE TO GO"}
                value={online ? "Online" : (danceClass.studio?.name ?? "In person")}
                note={
                  online
                    ? "The joining link is on your booking once you have a seat."
                    : `${danceClass.location ??
                        danceClass.studio?.address ??
                        "Address is on your booking once you have a seat."}${danceClass.room ? `. ${danceClass.room}` : ""}`
                }
              />
              <ExpectCard
                label="CLASS SIZE"
                value={`Up to ${danceClass.capacity}`}
                note={
                  seatsLeft > 0
                    ? `${seatsLeft} ${seatsLeft === 1 ? "seat is" : "seats are"} still open.`
                    : "Full, but you can join the waitlist."
                }
              />
              <ExpectCard
                label="LEVEL"
                value={LEVEL_LABEL[danceClass.level as keyof typeof LEVEL_LABEL] ?? danceClass.level}
                note={
                  openness === "first-timer"
                    ? "Pitched at people who have never danced before."
                    : "Open to all levels, so beginners are expected."
                }
              />
              {danceClass.wear && (
                <ExpectCard
                  label="WHAT TO WEAR"
                  value={danceClass.wear}
                  note={`From ${danceClass.studio?.name ?? danceClass.teacherName}.`}
                />
              )}
            </div>
          </div>

          {danceClass.plan && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <h2
                style={{
                  margin: 0,
                  fontFamily: DISPLAY,
                  fontWeight: 800,
                  fontSize: "clamp(24px, 3.5vw, 40px)",
                  letterSpacing: "-0.03em",
                }}
              >
                How the hour runs
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: 17,
                  lineHeight: 1.6,
                  color: "oklch(30% 0.02 60)",
                  whiteSpace: "pre-line",
                  maxWidth: "62ch",
                }}
              >
                {danceClass.plan}
              </p>
            </div>
          )}

          {siblings.length > 1 && !isCourse && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h2
                style={{
                  margin: 0,
                  fontFamily: DISPLAY,
                  fontWeight: 800,
                  fontSize: "clamp(24px, 3.5vw, 40px)",
                  letterSpacing: "-0.03em",
                }}
              >
                Pick a night
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
                  gap: 10,
                }}
              >
                {siblings.map((s) => {
                  const on = s.id === danceClass.id;
                  const left = Math.max(0, s.capacity - s._count.bookings);
                  return (
                    <Link
                      key={s.id}
                      href={`/first-class/${s.id}`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 2,
                        padding: "16px 18px",
                        borderRadius: 18,
                        textAlign: "left",
                        textDecoration: "none",
                        border: `1.5px solid ${on ? C.ink : "oklch(86% 0.01 70)"}`,
                        background: on ? C.ink : "oklch(99.5% 0.004 70)",
                        color: on ? C.heroCream : C.ink,
                      }}
                    >
                      <span
                        style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18 }}
                      >
                        {formatClassWhen(s.startTime, s.timezone)}
                      </span>
                      <span style={{ fontSize: 14, opacity: 0.85 }}>
                        {left > 0 ? `${left} spots left` : "Waitlist"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
              gap: 16,
            }}
          >
            {limits && <RolesCard limits={limits} roles={danceClass.roles} dateLabel={dayLabel(danceClass.startTime)} />}
            <PolicyCard
              policy={danceClass.policy}
              start={danceClass.startTime}
              tz={tz}
              hostName={danceClass.studio?.name ?? danceClass.hostName}
              course={isCourse}
            />
            {course && course.sessions[0] && danceClass.studio && (
              <CourseCard
                studioId={danceClass.studio.id}
                studioName={danceClass.studio.name}
                signedIn={Boolean(user)}
                course={{
                  id: course.sessions[0].id,
                  title: course.title,
                  style: course.style,
                  weeks: course.courseWeeks ?? 0,
                  priceCents: course.coursePriceCents ?? 0,
                  currency: course.currency,
                  started: course.startsOn.getTime() <= Date.now(),
                  startsLabel: dayLabel(course.startsOn),
                  nextTermLabel: nextTermLabel(course.startsOn, course.courseWeeks),
                }}
              />
            )}
          </div>
        </div>

        {/* Sticky book bar, the handoff's bottom rail. */}
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10,
            padding: "12px clamp(12px, 3vw, 24px) 16px",
            background: "oklch(99.5% 0.004 70 / 0.94)",
            backdropFilter: "blur(12px)",
            borderTop: "1px solid oklch(88% 0.01 70)",
          }}
        >
          <div
            style={{
              maxWidth: 880,
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{ display: "flex", flexDirection: "column", minWidth: 0 }}
            >
              <span
                style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 18 }}
              >
                {priceLine} · {isCourse ? `from ${formatClassWhen(danceClass.startTime, tz)}` : formatClassWhen(danceClass.startTime, tz)}
              </span>
              <span style={{ fontSize: 13, color: "oklch(42% 0.02 60)" }}>
                {courseStarted
                  ? `This term has started.${danceClass.series ? ` Next term starts ${nextTermLabel(danceClass.series.startsOn, weeks)}.` : ""}`
                  : seatsLeft > 0
                    ? `Free cancellation until ${cutoffLabel(danceClass.startTime, tz, danceClass.policy)}.`
                    : isCourse
                      ? "This course is full."
                      : "Full. Join the waitlist and we'll email if a seat opens."}
              </span>
            </div>
            {!courseStarted && !(isCourse && seatsLeft === 0) && (
            <Link
              href={bookHref}
              style={{
                flexShrink: 0,
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: 17,
                padding: "16px 30px",
                borderRadius: 999,
                background: C.heroBg,
                color: "#fff",
                whiteSpace: "nowrap",
                textDecoration: "none",
              }}
            >
              {seatsLeft === 0 ? "Join waitlist" : isCourse ? "Enrol" : isTrial ? "Book free trial" : "Book"}
            </Link>
            )}
          </div>
        </div>
      </div>

      <FunnelFooter />
    </FunnelPage>
  );
}

function ExpectCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div
      style={{
        padding: 22,
        borderRadius: 22,
        background: "oklch(99.5% 0.004 70)",
        border: "1px solid oklch(88% 0.01 70)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
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
      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 19 }}>
        {value}
      </div>
      <div style={{ fontSize: 15, color: "oklch(42% 0.02 60)" }}>{note}</div>
    </div>
  );
}
