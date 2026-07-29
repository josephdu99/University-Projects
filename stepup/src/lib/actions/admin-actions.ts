"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { logInfo } from "@/lib/logger";

async function audit(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  detail?: string
) {
  await db.auditLog.create({
    data: { actorId, action, targetType, targetId, detail: detail ?? null },
  });
  logInfo("admin.action", { actorId, action, targetType, targetId });
}

export async function suspendUserAction(
  userId: string,
  formData?: FormData
): Promise<void> {
  const admin = await requireAdmin();
  if (userId === admin.id) return; // don't lock yourself out

  const raw = formData?.get("reason");
  const reason = typeof raw === "string" && raw.trim() ? raw.trim() : "Suspended by admin";

  await db.user.update({
    where: { id: userId },
    data: { suspendedAt: new Date(), suspendedReason: reason },
  });

  await audit(admin.id, "SUSPEND_USER", "User", userId, reason);
  revalidatePath("/admin");
  revalidatePath(`/admin/users/${userId}`);
}

export async function unsuspendUserAction(userId: string): Promise<void> {
  const admin = await requireAdmin();

  await db.user.update({
    where: { id: userId },
    data: { suspendedAt: null, suspendedReason: null },
  });

  await audit(admin.id, "UNSUSPEND_USER", "User", userId);
  revalidatePath("/admin");
  revalidatePath(`/admin/users/${userId}`);
}

export async function suspendStudioAction(studioId: string): Promise<void> {
  const admin = await requireAdmin();

  await db.studio.update({
    where: { id: studioId },
    data: { suspendedAt: new Date() },
  });

  await audit(admin.id, "SUSPEND_STUDIO", "Studio", studioId);
  revalidatePath("/admin");
}

export async function unsuspendStudioAction(studioId: string): Promise<void> {
  const admin = await requireAdmin();

  await db.studio.update({ where: { id: studioId }, data: { suspendedAt: null } });

  await audit(admin.id, "UNSUSPEND_STUDIO", "Studio", studioId);
  revalidatePath("/admin");
}

/** Verifies an email manually, for support cases where mail won't deliver. */
export async function forceVerifyEmailAction(userId: string): Promise<void> {
  const admin = await requireAdmin();

  await db.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
  });

  await audit(admin.id, "FORCE_VERIFY_EMAIL", "User", userId);
  revalidatePath(`/admin/users/${userId}`);
}

/**
 * Corrects a gamification profile — for support cases like a mis-awarded
 * check-in. Deliberately additive rather than a free-form overwrite so the
 * audit trail stays meaningful.
 */
export async function adjustPointsAction(
  userId: string,
  formData: FormData
): Promise<void> {
  const admin = await requireAdmin();

  const raw = formData.get("delta");
  const delta = Number(raw);
  if (!Number.isFinite(delta) || delta === 0) return;

  const clamped = Math.max(-10_000, Math.min(10_000, Math.round(delta)));

  const profile = await db.gamificationProfile.upsert({
    where: { userId },
    create: { userId, totalPoints: Math.max(0, clamped) },
    update: {},
  });

  await db.gamificationProfile.update({
    where: { userId },
    data: { totalPoints: Math.max(0, profile.totalPoints + clamped) },
  });

  await audit(admin.id, "ADJUST_POINTS", "User", userId, `${clamped > 0 ? "+" : ""}${clamped}`);
  revalidatePath(`/admin/users/${userId}`);
}
