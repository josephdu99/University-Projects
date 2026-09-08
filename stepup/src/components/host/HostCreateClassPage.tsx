import Link from "next/link";
import { db } from "@/lib/db";
import { C, DISPLAY } from "@/lib/marketing-theme";
import {
  CreateClassForm,
  type ClassDefaults,
} from "@/components/classes/CreateClassForm";

/**
 * Create-a-class as a route rather than the collapsed accordion the old
 * dashboard buried it in, so the hero and empty-state buttons have somewhere
 * to go.
 *
 * `?from=<id>` powers "Run again": everything about a past class carries over
 * except the date, which the host has to choose again.
 */
export async function HostCreateClassPage({
  hostId,
  base,
  timezone,
  canCharge,
  fixedFormat,
  from,
}: {
  hostId: string;
  base: "/studio" | "/teach";
  timezone: string;
  canCharge: boolean;
  fixedFormat?: "ONLINE";
  from?: string;
}) {
  let defaults: ClassDefaults | undefined;

  if (from) {
    // Scoped to this host, so a guessed id can't leak someone else's class.
    const source = await db.danceClass.findFirst({
      where: { id: from, hostId },
    });
    if (source) {
      defaults = {
        title: source.title,
        style: source.style,
        level: source.level,
        description: source.description,
        format: source.format === "ONLINE" ? "ONLINE" : "IN_PERSON",
        location: source.location ?? "",
        onlineLink: source.onlineLink ?? "",
        durationMin: source.durationMin,
        capacity: source.capacity,
        points: source.points,
        priceDollars: source.priceCents / 100,
      };
    }
  }

  return (
    <div style={{ maxWidth: 620 }}>
      <Link
        href={base}
        style={{ fontSize: 14, fontWeight: 600, color: C.inkSoft, textDecoration: "none" }}
      >
        ← Back to dashboard
      </Link>

      <h1
        style={{
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: "clamp(28px, 4vw, 36px)",
          letterSpacing: "-0.02em",
          margin: "18px 0 6px",
        }}
      >
        {defaults ? "Run it again" : "Create a class"}
      </h1>
      <p style={{ fontSize: 15, color: C.label, margin: "0 0 28px" }}>
        {defaults
          ? `Everything from ${defaults.title} is filled in, pick a new date and publish.`
          : `Times are in ${timezone.replace(/_/g, " ")}, the zone your classes run in.`}
      </p>

      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 24,
          padding: "clamp(20px, 3vw, 28px)",
        }}
      >
        <CreateClassForm
          fixedFormat={fixedFormat}
          timezone={timezone}
          canCharge={canCharge}
          defaults={defaults}
        />
      </div>
    </div>
  );
}
