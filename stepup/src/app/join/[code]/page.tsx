import Link from "next/link";
import { headers } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { findInvite, inviteErrorMessage, type InviteLookup } from "@/lib/invites";
import { normaliseInviteCode } from "@/lib/team";
import { checkRateLimit, hashIp } from "@/lib/rate-limit";
import { C } from "@/lib/marketing-theme";
import { FunnelFooter, FunnelPage } from "@/components/first-class/FunnelChrome";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { SignedInNotice } from "@/components/onboarding/SignedInNotice";
import { TeachSignupForm } from "@/components/onboarding/TeachSignupForm";
import { AcceptInvite } from "@/components/onboarding/AcceptInvite";
import { Lede, PageTitle, errStyle } from "@/components/onboarding/fields";

export const metadata = {
  title: "Join your studio on StepUp",
  // An invite page names the person invited; it has no business in search.
  robots: { index: false, follow: false },
};

/**
 * A teacher's invite link. The code is looked up on the server, and lookups
 * are rate limited per address, so the page can't be used to try codes in
 * bulk. A good code opens the teacher page in invited mode.
 */
export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const [{ code: raw }, user, h] = await Promise.all([params, getSessionUser(), headers()]);
  const code = normaliseInviteCode(decodeURIComponent(raw));

  const ip = hashIp(h.get("x-forwarded-for")) ?? "unknown";
  const limit = await checkRateLimit(`invite-lookup:${ip}`, 30, 15 * 60_000);
  const invite: InviteLookup = limit.allowed ? await findInvite(code) : { ok: false, reason: "unknown" };
  const error = !limit.allowed
    ? "Too many tries from here. Wait a few minutes, then try your code again."
    : invite.ok
      ? null
      : inviteErrorMessage(invite);

  let body: React.ReactNode;
  if (!invite.ok) {
    body = user ? (
      <Centered>
        <PageTitle size="clamp(32px, 5vw, 48px)">That invite didn&apos;t work.</PageTitle>
        <p role="alert" style={{ ...errStyle, fontSize: 17, margin: 0 }}>
          {error}
        </p>
        <Link href="/teach" style={{ fontWeight: 700, color: C.ink }}>
          Back
        </Link>
      </Centered>
    ) : (
      <TeachSignupForm invite={null} codeError={error} initialCode={code} />
    );
  } else if (!user) {
    body = (
      <TeachSignupForm
        invite={{
          code: invite.code,
          studio: invite.studio,
          suburb: invite.suburb,
          invitedBy: invite.invitedBy,
          name: invite.name,
          contact: invite.contact,
          role: invite.role,
        }}
      />
    );
  } else if (user.role === "INSTRUCTOR") {
    body = (
      <Centered>
        <PageTitle size="clamp(32px, 5vw, 52px)">Join {invite.studio} on StepUp.</PageTitle>
        <Lede>
          {invite.invitedBy} invited you to teach at {invite.studio}
          {invite.suburb ? `, ${invite.suburb}` : ""}, as a{" "}
          {invite.role === "MANAGER" ? "manager" : "teacher"}. You&apos;re logged in as {user.name}; join
          with this account and the studio can put you down for its classes. Payments for them go
          through the studio.
        </Lede>
        <AcceptInvite code={invite.code} studio={invite.studio} name={user.name ?? "you"} />
      </Centered>
    );
  } else {
    body = <SignedInNotice user={user} here={`/join/${invite.code}`} what={`join ${invite.studio} as a teacher`} />;
  }

  return (
    <FunnelPage>
      <OnboardingHeader
        tag="FOR INSTRUCTORS"
        links={[
          { href: "/studios/join", label: "I RUN A STUDIO" },
          ...(user ? [] : [{ href: `/login?next=${encodeURIComponent(`/join/${code}`)}`, label: "LOG IN" }]),
        ]}
      />
      {body}
      <FunnelFooter />
    </FunnelPage>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "clamp(24px, 5vw, 56px) clamp(20px, 5vw, 48px) 96px", display: "flex", flexDirection: "column", gap: 20 }}>
      {children}
    </div>
  );
}
