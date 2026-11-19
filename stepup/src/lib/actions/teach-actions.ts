"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { DANCE_STYLES, classProblems, draftFromForm } from "@/lib/class-form";
import { createFirstTimerClass } from "@/lib/first-timer-classes";
import { DEFAULT_TIMEZONE, isValidTimeZone } from "@/lib/time";
import { logError } from "@/lib/logger";

export type TeachClassState = { error: string } | undefined;

/** A signed-in independent teacher's next First Timer class. */
export async function createIndependentClassAction(
  _prev: TeachClassState,
  formData: FormData,
): Promise<TeachClassState> {
  const user = await getSessionUser();
  if (!user || user.role !== "INSTRUCTOR") return { error: "Log in as a teacher to list a class." };

  const draft = draftFromForm((k) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : null;
  });
  const problems = classProblems(draft, "independent");
  if (problems.length) return { error: `Still needed: ${problems.join(", ")}.` };
  if (!(DANCE_STYLES as readonly string[]).includes(draft.style)) return { error: "Pick a style from the list." };

  const priceCents = Number(draft.price) * 100;
  if (priceCents > 0) {
    const payout = await db.payoutAccount.findUnique({ where: { userId: user.id } });
    if (!payout?.chargesEnabled) {
      return { error: "Set up payouts before charging for classes, or set the price to $0 for now." };
    }
  }

  const record = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { timezone: true } });
  const timezone = isValidTimeZone(record.timezone) ? record.timezone : DEFAULT_TIMEZONE;

  let id: string;
  try {
    const made = await db.$transaction((tx) =>
      createFirstTimerClass(tx, draft, { kind: "independent", hostId: user.id, timezone }, priceCents),
    );
    id = made.firstId;
  } catch (err) {
    logError("teach.createClass", err, { userId: user.id });
    return { error: "We couldn't publish that class. Try again in a moment." };
  }

  revalidatePath("/teach");
  revalidatePath("/start");
  revalidatePath("/discover");
  redirect(`/teach/welcome?class=${encodeURIComponent(id)}`);
}
