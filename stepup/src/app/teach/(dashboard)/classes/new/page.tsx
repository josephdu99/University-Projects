import Link from "next/link";
import { C } from "@/lib/marketing-theme";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { HostCreateClassPage } from "@/components/host/HostCreateClassPage";

export const metadata = { title: "Create a class, StepUp" };

export default async function TeachNewClassPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const user = await requireRole("INSTRUCTOR");
  const [{ from }, record, payout] = await Promise.all([
    searchParams,
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { timezone: true },
    }),
    db.payoutAccount.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <>
      <p style={{ margin: "0 0 18px", fontSize: 15, color: C.inkSoft }}>
        Teaching in person?{" "}
        <Link href="/teach/classes/first-timer" style={{ color: C.brand, fontWeight: 700 }}>
          Create a First Timer class
        </Link>{" "}
        instead: beginners are matched to it by style, music and suburb.
      </p>
      <HostCreateClassPage
        hostId={user.id}
        base="/teach"
        timezone={record.timezone}
        canCharge={Boolean(payout?.chargesEnabled)}
        fixedFormat="ONLINE"
        from={from}
      />
    </>
  );
}
