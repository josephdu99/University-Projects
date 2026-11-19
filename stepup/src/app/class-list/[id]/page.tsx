import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { canRunClass } from "@/lib/studio-access";
import { checkClassList } from "@/lib/signed-links";
import { classSheet } from "@/lib/studio-data";
import { toSheetProps } from "@/lib/sheet-props";
import { smsConfigured, smsNumberLabel } from "@/lib/sms";
import { C, DISPLAY, marketingFontClass } from "@/lib/marketing-theme";
import { ClassSheet } from "@/components/studio/ClassSheet";
import { StudioBanner, StudioPanelProvider } from "@/components/studio/StudioPanels";

export const metadata = { title: "Class list, StepUp", robots: { index: false } };

/**
 * A teacher's class list, opened from the email sent 48 hours before class
 * (or signed in). One tap marks each student attended or no-show; walk-ins
 * keep the head count right; the class can be messaged from here too.
 */
export default async function TeacherClassListPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ m?: string; e?: string; sig?: string }>;
}) {
  const [{ id }, q] = await Promise.all([params, searchParams]);
  const c = await db.danceClass.findUnique({
    where: { id },
    select: { id: true, hostId: true, studioId: true, teacherMemberId: true },
  });
  if (!c) notFound();

  const user = await getSessionUser();
  const viaSession = Boolean(user && (await canRunClass(user, c)));
  const link = q.m && q.e && q.sig ? { m: q.m, e: q.e, sig: q.sig } : null;
  const viaLink = Boolean(link && c.teacherMemberId === link.m && checkClassList(id, link.m, link.e, link.sig));
  if (!viaSession && !viaLink) {
    return (
      <main className={marketingFontClass} style={{ maxWidth: 560, margin: "0 auto", padding: "48px 24px", fontFamily: "var(--font-body), sans-serif" }}>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 30 }}>This link has run out</h1>
        <p style={{ fontSize: 16, color: C.inkSoft }}>
          Class list links work until the day after the class. <Link href="/login">Log in</Link> to see your classes.
        </p>
      </main>
    );
  }

  const s = await classSheet(id, c.hostId);
  if (!s) notFound();
  const props = toSheetProps(s, { canManage: false });

  return (
    <main
      className={marketingFontClass}
      style={{ background: C.bg, color: C.ink, minHeight: "100vh", fontFamily: "var(--font-body), sans-serif", padding: "24px clamp(12px, 4vw, 40px) 64px" }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div className="no-print" style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 22, marginBottom: 18 }}>
          StepUp
        </div>
        <StudioPanelProvider initial={null}>
          <StudioBanner />
          <ClassSheet s={props} venues={[]} smsOn={smsConfigured()} smsNumber={smsNumberLabel()} link={viaSession ? null : link} closeHref={null} />
        </StudioPanelProvider>
      </div>
    </main>
  );
}
