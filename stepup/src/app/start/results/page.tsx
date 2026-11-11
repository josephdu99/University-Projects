import Link from "next/link";
import Image from "next/image";
import { getSessionUser } from "@/lib/session";
import { ROLE_HOME, SECTION_LABEL } from "@/lib/roles";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { formatClassWhen, formatMoney } from "@/lib/time";
import {
  answerChips,
  answersFromParams,
  answersToParams,
  rankClasses,
  OPENNESS_LABEL,
  type ScoredClass,
} from "@/lib/first-class";
import { getBeginnerClasses } from "@/lib/first-class-data";
import { imageForStyle } from "@/lib/class-photo";
import {
  FunnelPage,
  FunnelHeader,
  FunnelFooter,
  Eyebrow,
} from "@/components/first-class/FunnelChrome";

export const metadata = {
  title: "Your matches, StepUp",
};

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{
    goals?: string;
    music?: string;
    where?: string;
    when?: string;
    all?: string;
  }>;
}) {
  const sp = await searchParams;
  const answers = answersFromParams(sp);
  const [user, candidates] = await Promise.all([
    getSessionUser(),
    getBeginnerClasses(),
  ]);
  const home = user ? ROLE_HOME[user.role] : null;
  const homeLabel = user ? SECTION_LABEL[user.role] : null;

  const ranked = rankClasses(candidates, answers);
  const showAll = sp.all === "1";
  const top = ranked.slice(0, 3);
  const rest = ranked.slice(3, showAll ? undefined : 3);

  const chips = answerChips(answers);
  const editHref = `/start?${answersToParams(answers).toString()}`;

  return (
    <FunnelPage>
      <FunnelHeader home={home} homeLabel={homeLabel} />

      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "clamp(24px, 4vw, 48px) clamp(20px, 5vw, 64px) 96px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 36,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Eyebrow>BEGINNER-FRIENDLY CLASSES ONLY</Eyebrow>
          <h1
            style={{
              margin: 0,
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: "clamp(34px, 6vw, 72px)",
              lineHeight: 0.95,
              letterSpacing: "-0.045em",
              textWrap: "balance",
            }}
          >
            {top.length === 0
              ? "No classes match that yet."
              : top.length === 1
                ? "One class picked for you."
                : `${top.length} classes picked for you.`}
          </h1>
          {chips.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{ fontSize: 14, color: C.inkSoft, marginRight: 4 }}
              >
                Based on
              </span>
              {chips.map((c) => (
                <span
                  key={c}
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: "oklch(99.5% 0.004 70)",
                    border: "1px solid oklch(86% 0.01 70)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c}
                </span>
              ))}
              <Link
                href={editHref}
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "oklch(55% 0.17 38)",
                  padding: "6px 8px",
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                Edit answers
              </Link>
            </div>
          )}
        </div>

        {top.length === 0 ? (
          <div
            style={{
              padding: "clamp(28px, 5vw, 48px)",
              borderRadius: 28,
              background: "oklch(99.5% 0.004 70)",
              border: `1px solid ${C.border}`,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              alignItems: "flex-start",
            }}
          >
            <p style={{ margin: 0, fontSize: 17, color: C.inkSoft, maxWidth: "52ch" }}>
              Nothing upcoming is open to beginners in that combination yet.
              Widening the days you can make, or leaving the suburb blank,
              usually turns something up.
            </p>
            <Link
              href={editHref}
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
              Change my answers
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
              gap: 20,
            }}
          >
            {top.map((c, i) => (
              <MatchCard key={c.id} c={c} rank={i + 1} />
            ))}
          </div>
        )}

        {rest.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              borderTop: `1.5px solid ${C.ink}`,
            }}
          >
            {rest.map((m) => {
              const img = imageForStyle(m.style);
              return (
                <Link
                  key={m.id}
                  href={`/first-class/${m.id}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "72px minmax(0,1fr) auto",
                    gap: 16,
                    alignItems: "center",
                    padding: "16px 0",
                    borderBottom: "1px solid oklch(86% 0.01 70)",
                    color: C.ink,
                    textDecoration: "none",
                  }}
                >
                  <Image
                    src={img.src}
                    alt=""
                    width={144}
                    height={144}
                    sizes="72px"
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 16,
                      objectFit: "cover",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18 }}
                    >
                      {m.title}
                    </span>
                    <span style={{ fontSize: 14, color: C.inkSoft }}>
                      {formatClassWhen(m.startTime, m.timezone)} ·{" "}
                      {m.studioName ?? m.hostName}
                    </span>
                  </div>
                  <span
                    style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap" }}
                  >
                    {m.priceCents === 0 ? "Free" : formatMoney(m.priceCents, m.currency)} →
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
          {!showAll && ranked.length > 3 ? (
            <Link
              href={`/start/results?${(() => {
                const p = answersToParams(answers);
                p.set("all", "1");
                return p.toString();
              })()}`}
              style={{
                border: `1.5px solid ${C.ink}`,
                fontWeight: 700,
                fontSize: 15,
                padding: "16px 26px",
                borderRadius: 999,
                color: C.ink,
                textDecoration: "none",
              }}
            >
              See {ranked.length - 3} more beginner-friendly{" "}
              {ranked.length - 3 === 1 ? "class" : "classes"}
            </Link>
          ) : (
            <Link
              href="/discover"
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: "oklch(55% 0.17 38)",
                textDecoration: "none",
              }}
            >
              Browse every class →
            </Link>
          )}
        </div>
      </div>

      <FunnelFooter />
    </FunnelPage>
  );
}

function MatchCard({ c, rank }: { c: ScoredClass; rank: number }) {
  const img = imageForStyle(c.style);
  const seatsLeft = Math.max(0, c.capacity - c.seatsTaken);
  return (
    <Link
      href={`/first-class/${c.id}`}
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 28,
        overflow: "hidden",
        background: "oklch(99.5% 0.004 70)",
        border: "1px solid oklch(88% 0.01 70)",
        color: C.ink,
        textDecoration: "none",
      }}
    >
      <div style={{ position: "relative" }}>
        <Image
          src={img.src}
          alt={img.alt}
          width={1408}
          height={768}
          sizes="(max-width: 900px) 90vw, 400px"
          style={{
            display: "block",
            width: "100%",
            aspectRatio: "16/11",
            objectFit: "cover",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: 14,
            top: 14,
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 14,
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: C.ink,
            color: C.heroCream,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {rank}
        </span>
        {/* Only shown when somebody really is new, never as a default. */}
        {c.firstTimersBooked > 0 && (
          <span
            style={{
              position: "absolute",
              right: 14,
              top: 14,
              fontSize: 12,
              fontWeight: 700,
              padding: "6px 10px",
              borderRadius: 999,
              background: "oklch(99.5% 0.004 70)",
              whiteSpace: "nowrap",
            }}
          >
            {c.firstTimersBooked} new here
          </span>
        )}
      </div>

      <div
        style={{
          padding: "22px 22px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          flex: 1,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div
            style={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: 24,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            {c.title}
          </div>
          <div style={{ fontSize: 15, color: C.inkSoft }}>
            {formatClassWhen(c.startTime, c.timezone)} ·{" "}
            {c.studioName ?? c.hostName}
          </div>
        </div>

        <div
          style={{
            borderRadius: 18,
            background: "oklch(94% 0.045 65)",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "oklch(48% 0.15 38)",
            }}
          >
            WHY THIS FITS YOU
          </div>
          {/* Each line names the fact that earned it, so it is checkable
              against the class page rather than taken on trust. */}
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              fontSize: 15,
              lineHeight: 1.4,
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            {c.reasons.slice(0, 3).map((r) => (
              <li key={r} style={{ textWrap: "pretty" }}>
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            paddingTop: 4,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 20 }}
            >
              {c.priceCents === 0 ? "Free" : formatMoney(c.priceCents, c.currency)}
            </span>
            <span style={{ fontSize: 12, color: C.inkSoft }}>
              {seatsLeft > 0
                ? `${seatsLeft} ${seatsLeft === 1 ? "seat" : "seats"} left`
                : "Waitlist only"}
            </span>
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: 15,
              padding: "12px 18px",
              borderRadius: 999,
              background: C.ink,
              color: C.heroCream,
              whiteSpace: "nowrap",
            }}
          >
            View class →
          </span>
        </div>

        <div style={{ fontSize: 12, color: C.inkSoft }}>
          {OPENNESS_LABEL[c.openness]}
        </div>
      </div>
    </Link>
  );
}
