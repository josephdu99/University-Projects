import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { publicName } from "@/lib/roles";
import { HostDashboard } from "@/components/host/HostDashboard";
import { VerifyBanner } from "@/components/VerifyBanner";
import { AppChrome, hostNav } from "@/components/shell/AppChrome";
import { FunnelFooter, FunnelPage } from "@/components/first-class/FunnelChrome";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { SignedInNotice } from "@/components/onboarding/SignedInNotice";
import { TeachSignupForm } from "@/components/onboarding/TeachSignupForm";
import { TeachingTeams } from "@/components/teach/TeachingTeams";
import { normaliseInviteCode } from "@/lib/team";

export const metadata = {
  title: "Teach with StepUp",
  description:
    "Register to teach on StepUp: list First Timer classes under your own name, or join your studio's team with its invite code.",
};

/**
 * /teach is two pages at one address, as the design has it: for a teacher
 * who is signed in it is their dashboard, and for everyone else it is where
 * they sign up to teach (or enter a studio's invite code).
 */
export default async function TeachPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const [user, { invite }] = await Promise.all([getSessionUser(), searchParams]);

  // A shared ?invite=CODE link goes to the invite's own page.
  if (invite) redirect(`/join/${encodeURIComponent(normaliseInviteCode(invite))}`);

  if (user?.role === "INSTRUCTOR") return <TeachDashboard user={user} />;

  return (
    <FunnelPage>
      <OnboardingHeader
        tag="FOR INSTRUCTORS"
        links={[
          { href: "/studios/join", label: "I RUN A STUDIO" },
          ...(user ? [] : [{ href: "/login", label: "LOG IN" }]),
        ]}
      />
      {user ? (
        <SignedInNotice user={user} here="/teach" what="register to teach" />
      ) : (
        <TeachSignupForm invite={null} />
      )}
      <FunnelFooter />
    </FunnelPage>
  );
}

async function TeachDashboard({
  user,
}: {
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
}) {
  const [record, payout] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { name: true, displayName: true, timezone: true, teachStyles: true },
    }),
    db.payoutAccount.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <AppChrome
      items={hostNav("/teach")}
      user={{ name: user.name ?? "You", mark: user.avatarMark, color: user.avatarColor }}
    >
      <div style={{ marginBottom: 20 }}>
        <VerifyBanner verified={user.verified} />
      </div>

      <HostDashboard
        hostId={user.id}
        base="/teach"
        title={publicName(record)}
        metaPrimary={
          record.teachStyles.length
            ? `Teaching ${record.teachStyles.join(", ")}`
            : "Independent teacher"
        }
        timezone={record.timezone}
        payoutsConnected={Boolean(payout?.chargesEnabled && payout?.payoutsEnabled)}
        editHref="/profile"
        extra={<TeachingTeams userId={user.id} />}
      />
    </AppChrome>
  );
}
