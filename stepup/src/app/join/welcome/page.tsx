import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { firstName } from "@/lib/team";
import { C } from "@/lib/marketing-theme";
import { FunnelFooter, FunnelPage } from "@/components/first-class/FunnelChrome";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { DoneTick, FactCard, Lede, PageTitle } from "@/components/onboarding/fields";

export const metadata = { title: "You're on the team, StepUp" };

/** "On the team": the membership this person most recently joined. */
export default async function JoinWelcomePage() {
  const user = await requireUser();
  const m = await db.studioMember.findFirst({
    where: { userId: user.id, status: "ACTIVE", joinedAt: { not: null } },
    orderBy: { joinedAt: "desc" },
    include: {
      studio: { select: { name: true } },
      invitedBy: { select: { name: true } },
    },
  });
  if (!m) redirect("/teach");

  const by = m.invitedBy?.name ?? m.studio.name;
  return (
    <FunnelPage>
      <OnboardingHeader tag="FOR INSTRUCTORS" links={[{ href: "/teach", label: "YOUR DASHBOARD" }]} />
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "clamp(16px, 3vw, 32px) clamp(20px, 5vw, 48px) 96px", display: "flex", flexDirection: "column", gap: 22 }}>
        <DoneTick />
        <PageTitle>
          You&apos;re on the {m.studio.name} team, {firstName(user.name ?? "")}.
        </PageTitle>
        <Lede>
          {`${by} can now put you down to teach classes. They'll show on your dashboard with who has booked.`}
        </Lede>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 12 }}>
          <FactCard label="STUDIO" value={m.studio.name} />
          <FactCard label="YOUR ACCESS" value={m.role === "MANAGER" ? "Manager" : "Teacher"} />
          <FactCard label="PAYMENTS" value={`Through ${m.studio.name}`} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Link
            href="/teach"
            className="su-dark-pill"
            style={{ fontWeight: 700, fontSize: 16, padding: "16px 24px", borderRadius: 999, background: C.ink, color: "oklch(96% 0.025 75)", textDecoration: "none" }}
          >
            Done
          </Link>
          {m.role === "MANAGER" && (
            <Link
              href="/studio"
              style={{ fontWeight: 700, fontSize: 16, padding: "14px 22px", borderRadius: 999, border: `1.5px solid ${C.ink}`, color: C.ink, textDecoration: "none" }}
            >
              Open the studio dashboard
            </Link>
          )}
        </div>
      </div>
      <FunnelFooter />
    </FunnelPage>
  );
}
