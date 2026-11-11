import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveBookingViewer } from "@/lib/guest-session";
import { C } from "@/lib/marketing-theme";
import { formatClassWhen, formatMoney } from "@/lib/time";
import { hasStarted } from "@/lib/first-class";
import { getPublicClass, getNextOptions } from "@/lib/first-class-data";
import { imageForStyle } from "@/lib/class-photo";
import {
  AfterClass,
  type NextOption,
} from "@/components/first-class/AfterClass";
import {
  FunnelPage,
  Wordmark,
  Eyebrow,
} from "@/components/first-class/FunnelChrome";

export const metadata = { title: "How was it? StepUp" };

/**
 * Step 8, the last one: what happens after the class.
 *
 * Gated on having actually booked it and on the class having started, because
 * "how was it?" before it happens is nonsense. The classes offered are real
 * upcoming ones, picked by style, so every card leads somewhere bookable.
 */
export default async function AfterClassPage({
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

  const started = hasStarted(danceClass.startTime);
  const raw = await getNextOptions({
    excludeClassId: danceClass.id,
    style: danceClass.style,
    take: 3,
  });

  const options: NextOption[] = raw.map((o) => ({
    id: o.id,
    title: o.title,
    meta: `${formatClassWhen(o.startTime, o.timezone)} · ${
      o.studioName ?? o.hostName
    } · ${o.priceCents === 0 ? "Free" : formatMoney(o.priceCents, o.currency)}`,
    src: imageForStyle(o.style).src,
    sameStyle: o.sameStyle,
  }));

  return (
    <FunnelPage>
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "20px clamp(20px, 5vw, 64px) 0",
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
          maxWidth: 1180,
          margin: "0 auto",
          padding: "clamp(28px, 6vw, 56px) clamp(20px, 5vw, 64px) 80px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <Eyebrow>
          {started ? "AFTER YOUR CLASS" : "ONCE YOU'VE BEEN"}
        </Eyebrow>

        {started ? (
          <AfterClass classTitle={danceClass.title} options={options} />
        ) : (
          <div
            style={{
              padding: "clamp(24px, 5vw, 40px)",
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
              {danceClass.title} hasn&apos;t happened yet. Come back after{" "}
              {formatClassWhen(danceClass.startTime, danceClass.timezone)} and
              this is where you pick what to do next.
            </p>
            <Link
              href={`/first-class/${id}/before${viewer.token ? `?t=${encodeURIComponent(viewer.token)}` : ""}`}
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
              What to know before you go
            </Link>
          </div>
        )}
      </div>
    </FunnelPage>
  );
}
