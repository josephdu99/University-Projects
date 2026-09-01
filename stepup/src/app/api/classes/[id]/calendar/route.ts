import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { publicName } from "@/lib/roles";

/**
 * Downloads one class as an .ics file, so "Add to calendar" is a real action
 * rather than a button that does nothing.
 *
 * Gated on having a live booking: the file carries the online joining link,
 * which is not something a stranger with the class id should be handed.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  const booking = await db.booking.findFirst({
    where: {
      userId: user.id,
      classId: id,
      status: { in: ["BOOKED", "ATTENDED", "PENDING_PAYMENT", "WAITLISTED"] },
    },
    include: {
      class: {
        include: {
          studio: { select: { name: true, address: true, city: true } },
          host: { select: { name: true, displayName: true } },
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "No booking for this class." }, { status: 404 });
  }

  const c = booking.class;
  const end = new Date(c.startTime.getTime() + c.durationMin * 60_000);
  const location = c.studio
    ? [c.studio.name, c.studio.address, c.studio.city].filter(Boolean).join(", ")
    : (c.onlineLink ?? "Online");

  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//StepUp//Classes//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${c.id}@stepup.dance`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(c.startTime)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(c.title)}`,
    `LOCATION:${esc(location)}`,
    `DESCRIPTION:${esc(`${c.style} with ${publicName(c.host)}.${c.onlineLink ? ` Join: ${c.onlineLink}` : ""}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug(c.title)}.ics"`,
      // Personal, and it changes when the class does.
      "Cache-Control": "no-store",
    },
  });
}

/** Always UTC — the instant is unambiguous, the calendar app localises it. */
function stamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Commas, semicolons, backslashes and newlines are structural in iCalendar. */
function esc(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function slug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "class";
}
