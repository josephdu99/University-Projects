import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getStudioAccess } from "@/lib/studio-access";
import { FunnelPage, FunnelFooter } from "@/components/first-class/FunnelChrome";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { StudioSignupForm } from "@/components/onboarding/StudioSignupForm";
import { SignedInNotice } from "@/components/onboarding/SignedInNotice";

export const metadata = {
  title: "Sign up your studio, StepUp",
  description:
    "List your studio on StepUp, invite your teachers, and fill your First Timer classes with Sydney beginners.",
};

export default async function StudioSignupPage() {
  const user = await getSessionUser();
  // Someone who already runs a studio has nothing to sign up for.
  if (user && (await getStudioAccess(user.id))) redirect("/studio");

  return (
    <FunnelPage>
      <OnboardingHeader
        tag="FOR STUDIOS"
        links={[
          { href: "/teach", label: "I TEACH INDEPENDENTLY" },
          ...(user ? [] : [{ href: "/login", label: "LOG IN" }]),
        ]}
      />
      {user ? (
        <SignedInNotice user={user} here="/studios/join" what="sign up a studio" />
      ) : (
        <StudioSignupForm />
      )}
      <FunnelFooter />
    </FunnelPage>
  );
}
