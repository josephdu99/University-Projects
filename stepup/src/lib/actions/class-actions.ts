"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { recordAttendance } from "@/lib/gamification";
import { requireRole, requireUser } from "@/lib/session";
import { CLASS_FORMATS, DANCE_LEVELS } from "@/lib/roles";

export type FormState = { error?: string; success?: string } | undefined;

export async function bookClassAction(classId: string): Promise<void> {
  const user = await requireRole("STUDENT");

  const danceClass = await db.danceClass.findUnique({
    where: { id: classId },
    include: { _count: { select: { bookings: { where: { status: { not: "CANCELLED" } } } } } },
  });
  if (!danceClass) return;

  const existing = await db.booking.findUnique({
    where: { userId_classId: { userId: user.id, classId } },
  });
  if (existing) return;

  if (danceClass._count.bookings >= danceClass.capacity) return;

  await db.booking.create({ data: { userId: user.id, classId } });

  revalidatePath("/discover");
  revalidatePath("/schedule");
  revalidatePath(`/classes/${classId}`);
}

export async function cancelBookingAction(bookingId: string): Promise<void> {
  const user = await requireUser();

  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.userId !== user.id || booking.status !== "BOOKED") {
    return;
  }

  await db.booking.delete({ where: { id: bookingId } });

  revalidatePath("/discover");
  revalidatePath("/schedule");
  revalidatePath(`/classes/${booking.classId}`);
}

export type AttendState =
  | { error: string }
  | { success: true; points: number; newBadges: { name: string; emoji: string }[] }
  | undefined;

export async function selfReportAttendanceAction(
  _prev: AttendState,
  formData: FormData
): Promise<AttendState> {
  const user = await requireUser();
  const bookingId = formData.get("bookingId");
  if (typeof bookingId !== "string") return { error: "Missing booking." };

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { class: true },
  });
  if (!booking || booking.userId !== user.id) {
    return { error: "Booking not found." };
  }
  if (booking.class.format !== "ONLINE") {
    return { error: "Only online classes can be self-reported." };
  }
  if (booking.class.startTime > new Date()) {
    return { error: "This class hasn't started yet." };
  }

  const result = await recordAttendance(bookingId);

  revalidatePath("/schedule");
  revalidatePath("/profile");
  revalidatePath("/leaderboard");

  if (result.alreadyAttended) {
    return { error: "Already marked as attended." };
  }

  return {
    success: true,
    points: booking.class.points,
    newBadges: result.newBadges,
  };
}

export async function checkInStudentAction(bookingId: string): Promise<void> {
  const user = await requireUser();
  if (user.role !== "STUDIO_OWNER" && user.role !== "INSTRUCTOR") return;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { class: true },
  });
  if (!booking || booking.class.hostId !== user.id) return;

  await recordAttendance(bookingId);

  revalidatePath(`/studio/classes/${booking.classId}`);
  revalidatePath(`/teach/classes/${booking.classId}`);
}

const createClassSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(80),
  style: z.string().trim().min(2, "Add a dance style").max(40),
  description: z.string().trim().min(3, "Add a short description").max(400),
  format: z.enum(CLASS_FORMATS),
  level: z.enum(DANCE_LEVELS),
  location: z.string().trim().max(160).optional(),
  onlineLink: z.string().trim().max(300).optional(),
  date: z.string().min(1, "Pick a date"),
  time: z.string().min(1, "Pick a time"),
  durationMin: z.coerce.number().int().min(15).max(240),
  capacity: z.coerce.number().int().min(1).max(500),
  points: z.coerce.number().int().min(5).max(200),
});

export type CreateClassState = { error: string } | { success: true } | undefined;

export async function createClassAction(
  _prev: CreateClassState,
  formData: FormData
): Promise<CreateClassState> {
  const user = await requireUser();
  if (user.role !== "STUDIO_OWNER" && user.role !== "INSTRUCTOR") {
    return { error: "Only studios and instructors can create classes." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = createClassSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const data = parsed.data;

  const startTime = new Date(`${data.date}T${data.time}`);
  if (Number.isNaN(startTime.getTime())) {
    return { error: "Enter a valid date and time." };
  }
  if (startTime < new Date()) {
    return { error: "Pick a time in the future." };
  }

  let studioId: string | null = null;
  let studioAddress: string | null = null;
  if (user.role === "STUDIO_OWNER") {
    const studio = await db.studio.findUnique({ where: { ownerId: user.id } });
    if (!studio) return { error: "Studio profile not found." };
    studioId = studio.id;
    studioAddress = `${studio.address}, ${studio.city}`;
  }

  const format = user.role === "INSTRUCTOR" ? "ONLINE" : data.format;

  await db.danceClass.create({
    data: {
      title: data.title,
      style: data.style,
      description: data.description,
      format,
      level: data.level,
      location: format === "IN_PERSON" ? data.location || studioAddress : null,
      onlineLink: format === "ONLINE" ? data.onlineLink || null : null,
      startTime,
      durationMin: data.durationMin,
      capacity: data.capacity,
      points: data.points,
      hostId: user.id,
      studioId,
    },
  });

  revalidatePath("/discover");
  revalidatePath("/studio");
  revalidatePath("/teach");

  return { success: true };
}
