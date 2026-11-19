import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { publicName } from "@/lib/roles";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { InstructorClassForm } from "@/components/teach/InstructorClassForm";

export const metadata = { title: "Create a First Timer class, StepUp" };

/** An independent teacher's in-person First Timer class, listed under their name. */
export default async function TeachFirstTimerClassPage() {
  const user = await requireRole("INSTRUCTOR");
  const [record, payout] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { name: true, displayName: true, teacherNote: true, teachStyles: true },
    }),
    db.payoutAccount.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <Link href="/teach" style={{ fontSize: 14, fontWeight: 600, color: C.inkSoft, textDecoration: "none" }}>
          ← Dashboard
        </Link>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "oklch(52% 0.16 35)", margin: "14px 0 6px" }}>
          NEW FIRST TIMER CLASS
        </div>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: "clamp(28px, 4vw, 36px)", letterSpacing: "-0.02em", margin: 0 }}>
          Create a First Timer class
        </h1>
        <p style={{ margin: "8px 0 0", fontSize: 15.5, color: C.inkSoft }}>
          In person, listed under your name. For an online class,{" "}
          <Link href="/teach/classes/new" style={{ color: C.brand, fontWeight: 600 }}>
            use the online class form
          </Link>
          .
        </p>
      </div>
      <InstructorClassForm
        teacher={publicName(record)}
        note={record.teacherNote}
        styles={record.teachStyles}
        canCharge={Boolean(payout?.chargesEnabled)}
        photoUrl={null}
      />
    </div>
  );
}
