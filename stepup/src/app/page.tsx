import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { ROLE_HOME, SECTION_LABEL } from "@/lib/roles";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { TESTIMONIALS } from "@/lib/marketing-content";
import {
  FunnelPage,
  FunnelHeader,
  FunnelFooter,
} from "@/components/first-class/FunnelChrome";

export const metadata = {
  title: "StepUp, never danced? Start here",
  description:
    "No experience or partner needed. Answer three quick questions and we'll match you with a first class that fits.",
};

export default async function Home() {
  const user = await getSessionUser();
  const home = user ? ROLE_HOME[user.role] : null;
  const homeLabel = user ? SECTION_LABEL[user.role] : null;

  // The reassurance panel claims beginners are expected. That is only worth
  // saying if beginner-friendly classes exist, so the figure is counted.
  const beginnerCount = await db.danceClass.count({
    where: {
      startTime: { gte: new Date() },
      cancelledAt: null,
      level: { in: ["BEGINNER", "ALL_LEVELS"] },
    },
  });

  return (
    <FunnelPage>
      <FunnelHeader home={home} homeLabel={homeLabel} />

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "clamp(24px, 5vw, 64px) clamp(20px, 5vw, 64px) 0",
          boxSizing: "border-box",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 440px), 1fr))",
          gap: "clamp(40px, 6vw, 80px)",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: "clamp(48px, 8vw, 112px)",
              lineHeight: 0.92,
              letterSpacing: "-0.05em",
              textWrap: "balance",
            }}
          >
            Never danced?{" "}
            <span style={{ color: C.heroBg }}>Start here.</span>
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: "clamp(18px, 1.6vw, 21px)",
              color: "oklch(40% 0.02 60)",
              maxWidth: "34ch",
              textWrap: "pretty",
            }}
          >
            No experience or partner needed. Answer three quick questions and
            we&apos;ll match you with a first class that fits.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <Link
              href="/start"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: "clamp(20px, 2vw, 26px)",
                padding: "clamp(20px, 3vw, 28px) clamp(28px, 4vw, 44px)",
                borderRadius: 999,
                background: C.heroBg,
                color: C.onBrand,
                textDecoration: "none",
                boxShadow: "0 18px 36px -14px oklch(50% 0.17 38 / 0.7)",
              }}
            >
              Find my first class{" "}
              <span style={{ fontSize: "clamp(24px, 2.4vw, 30px)" }}>→</span>
            </Link>
            <span
              style={{
                fontSize: 14,
                color: "oklch(48% 0.02 60)",
                paddingLeft: 8,
              }}
            >
              3 questions · under 30 seconds
            </span>
          </div>
        </div>

        <div style={{ position: "relative", padding: "0 0 40px 40px" }}>
          {/* Photography from the handoff. The alt text says what is in the
              picture; it does not claim these dancers are StepUp beginners. */}
          <Image
            src="/photos/sdc-salsa-social.jpg"
            alt="A couple dancing salsa at a busy social, others dancing behind them"
            width={1408}
            height={768}
            priority
            sizes="(max-width: 900px) 90vw, 600px"
            style={{
              display: "block",
              width: "100%",
              aspectRatio: "4/5",
              maxHeight: 640,
              objectFit: "cover",
              borderRadius: 32,
            }}
          />
          <Image
            src="/photos/sdc-hiphop-jam.jpg"
            alt="A hip hop class mid-routine"
            width={1408}
            height={768}
            sizes="(max-width: 900px) 40vw, 260px"
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              width: "44%",
              aspectRatio: "1/1",
              objectFit: "cover",
              borderRadius: 24,
              border: `6px solid ${C.bg}`,
            }}
          />
        </div>
      </div>

      {/* ── REASSURANCE ────────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "clamp(56px, 9vw, 120px) clamp(20px, 5vw, 64px) 0",
          boxSizing: "border-box",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
          gap: 14,
        }}
      >
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 28,
            padding: 28,
            minHeight: 260,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            gap: 8,
            background: C.heroBg,
            color: C.heroCream,
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              right: 14,
              top: 0,
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: 200,
              lineHeight: 1,
              letterSpacing: "-0.08em",
              color: "oklch(74% 0.15 48)",
              pointerEvents: "none",
            }}
          >
            0
          </div>
          <div
            style={{
              position: "relative",
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: 28,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            No experience needed.
          </div>
          <div style={{ position: "relative", fontSize: 16, maxWidth: "28ch" }}>
            {beginnerCount > 0
              ? `${beginnerCount} upcoming ${beginnerCount === 1 ? "class is" : "classes are"} open to people who have never danced.`
              : "Every class we match you with is open to people who have never danced."}
          </div>
        </div>

        <div
          style={{
            borderRadius: 28,
            padding: 28,
            minHeight: 260,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 20,
            background: C.ink,
            color: C.heroCream,
          }}
        >
          <div
            style={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: "clamp(40px, 5vw, 68px)",
              lineHeight: 0.88,
              letterSpacing: "-0.05em",
              color: C.heroBg,
            }}
          >
            Solo
            <br />
            is normal.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                fontFamily: DISPLAY,
                fontWeight: 800,
                fontSize: 24,
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              No partner needed.
            </div>
            <div style={{ fontSize: 16, color: "oklch(80% 0.02 70)" }}>
              You book one seat, for you.
            </div>
          </div>
        </div>

        {/*
          The handoff's third card promised "Credit back" on a first class:
          tell us within 24 hours and get credit valid 6 months at any studio.
          There is no credit or refund machinery in the app, so promising it
          here would be a promise nobody could keep. This says what booking
          actually gets you, which the booking flow does honour.
        */}
        <div
          style={{
            borderRadius: 28,
            minHeight: 260,
            display: "flex",
            flexDirection: "column",
            background: "oklch(99.5% 0.004 70)",
            border: `1.5px solid ${C.ink}`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "28px 28px 20px",
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: 28,
              lineHeight: 1.2,
              letterSpacing: "-0.03em",
            }}
          >
            Changed your mind?
            <br />
            <span
              style={{
                display: "inline-block",
                marginTop: 4,
                background: C.heroBg,
                color: C.onBrand,
                padding: "0 8px",
                borderRadius: 8,
              }}
            >
              Cancel free.
            </span>
          </div>
          <div
            style={{
              position: "relative",
              marginTop: "auto",
              borderTop: "2px dashed oklch(80% 0.01 70)",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: -14,
                top: -14,
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: C.bg,
                borderRight: `1.5px solid ${C.ink}`,
              }}
            />
            <span
              style={{
                position: "absolute",
                right: -14,
                top: -14,
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: C.bg,
                borderLeft: `1.5px solid ${C.ink}`,
              }}
            />
          </div>
          <div
            style={{
              padding: "16px 28px 22px",
              fontSize: 13,
              lineHeight: 1.45,
              color: "oklch(40% 0.02 60)",
            }}
          >
            Cancel any booking from your schedule and the seat goes back to the
            class. Paid classes are refunded through the card you used.
          </div>
        </div>
      </div>

      {/* ── BEGINNERS, only with real quotes ───────────────────────────── */}
      {TESTIMONIALS.length > 0 && (
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "clamp(72px, 12vw, 150px) clamp(20px, 5vw, 64px) 0",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.14em",
              color: "oklch(55% 0.17 38)",
              marginBottom: 14,
            }}
          >
            FROM DANCERS WHO STARTED HERE
          </div>
          <h2
            style={{
              margin: "0 0 36px",
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: "clamp(30px, 4.5vw, 54px)",
              lineHeight: 1,
              letterSpacing: "-0.04em",
              maxWidth: "18ch",
              textWrap: "balance",
            }}
          >
            Everyone here was nervous at the door.
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: 20,
            }}
          >
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                <p style={{ margin: 0, fontSize: 17, textWrap: "pretty" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div style={{ fontSize: 14, color: C.inkSoft }}>
                  {t.name} · {t.role}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CLOSING ────────────────────────────────────────────────────── */}
      <div style={{ padding: "clamp(72px, 12vw, 150px) 14px 14px" }}>
        <div
          style={{
            borderRadius: 32,
            background: C.ink,
            color: C.heroCream,
            padding: "clamp(48px, 8vw, 100px) clamp(24px, 5vw, 64px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 28,
            textAlign: "center",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: "clamp(32px, 5.5vw, 68px)",
              lineHeight: 1,
              letterSpacing: "-0.04em",
              maxWidth: "16ch",
              textWrap: "balance",
            }}
          >
            Your first class is three questions away.
          </h2>
          <Link
            href="/start"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: 18,
              padding: "20px 30px",
              borderRadius: 999,
              background: C.heroBg,
              color: C.onBrand,
              textDecoration: "none",
            }}
          >
            Find my first class <span style={{ fontSize: 20 }}>→</span>
          </Link>
        </div>
      </div>

      <FunnelFooter />
    </FunnelPage>
  );
}
