import Link from "next/link";
import Image from "next/image";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { OPENNESS_LABEL, type ScoredClass } from "@/lib/first-class";
import { imageForStyle } from "@/lib/class-photo";
import type { LiveCandidate } from "./match-types";

/**
 * One ranked class. Display strings (`whenLabel`, `priceLabel`) arrive
 * precomputed from the server, so the browser does not need the timezone
 * library to show them and server and client render the same text.
 */
export function MatchCard({
  c,
  rank,
}: {
  c: ScoredClass<LiveCandidate>;
  rank: number;
}) {
  const img = imageForStyle(c.style);
  const seatsLeft = Math.max(0, c.capacity - c.seatsTaken);
  return (
    <Link
      href={`/first-class/${c.id}`}
      className="stepup-lift"
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
          sizes="(max-width: 900px) 90vw, 360px"
          style={{
            display: "block",
            width: "100%",
            height: "auto",
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
            {c.firstTimersBooked} first-timer{c.firstTimersBooked === 1 ? "" : "s"} booked
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
            {c.whenLabel} · {c.studioName ?? c.hostName}
            {c.suburb ? `, ${c.suburb}` : c.format === "ONLINE" ? ", online" : ""}
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
              color: "oklch(45% 0.15 38)",
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
            <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 20 }}>
              {c.priceLabel}
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

/** A compact row for the "see more" list under the top three. */
export function MatchRow({
  c,
}: {
  c: ScoredClass<LiveCandidate>;
}) {
  const img = imageForStyle(c.style);
  return (
    <Link
      href={`/first-class/${c.id}`}
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
        style={{ width: 72, height: 72, borderRadius: 16, objectFit: "cover" }}
      />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18 }}>
          {c.title}
        </span>
        <span style={{ fontSize: 14, color: C.inkSoft }}>
          {c.whenLabel} · {c.studioName ?? c.hostName}
          {c.suburb ? `, ${c.suburb}` : c.format === "ONLINE" ? ", online" : ""}
        </span>
      </div>
      <span style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap" }}>
        {c.priceLabel} →
      </span>
    </Link>
  );
}
