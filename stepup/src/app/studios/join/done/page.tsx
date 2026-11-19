import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getStudioAccess } from "@/lib/studio-access";
import { imageUrl } from "@/lib/images";
import { firstName } from "@/lib/team";
import { DISPLAY } from "@/lib/marketing-theme";
import { FunnelPage, FunnelFooter } from "@/components/first-class/FunnelChrome";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { StudioCard } from "@/components/onboarding/StudioSignupForm";
import { ClearDrafts } from "@/components/onboarding/ClearDrafts";
import { STUDIO_DRAFT_KEY } from "@/components/onboarding/draft-keys";
import { DoneTick, Lede, PageTitle, ORANGE_TEXT } from "@/components/onboarding/fields";
import { findSuburb } from "@/lib/suburbs";

export const metadata = { title: "Your studio is set up, StepUp" };

const NEXT_STEPS = [
  ["Invite your teachers.", "They make their own login; you stay in charge of the timetable."],
  ["Create your first class.", "Pick a teacher, a night and a price."],
  ["Set up payouts.", "Needed before you charge for classes."],
] as const;

/** Step 3 of studio sign-up, read back from what was actually saved. */
export default async function StudioSignupDonePage() {
  const user = await requireUser();
  const access = await getStudioAccess(user.id);
  if (!access) redirect("/studios/join");
  const { studio } = access;
  const suburb = findSuburb(studio.suburb);

  return (
    <FunnelPage>
      <ClearDrafts keys={[STUDIO_DRAFT_KEY]} />
      <OnboardingHeader tag="FOR STUDIOS" links={[]} />
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "clamp(16px, 3vw, 32px) clamp(20px, 5vw, 48px) 96px",
          boxSizing: "border-box",
          display: "flex",
          flexWrap: "wrap",
          gap: "clamp(32px, 5vw, 64px)",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: "999 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: 22 }}>
          <DoneTick />
          <PageTitle>
            {studio.name} is set up, {firstName(user.name ?? "")}.
          </PageTitle>
          <Lede>
            Your studio page is ready. Everything else happens from your studio dashboard,
            whenever you&apos;re ready.
          </Lede>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {NEXT_STEPS.map(([title, body], i) => (
              <li
                key={title}
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px minmax(0,1fr)",
                  gap: 14,
                  alignItems: "center",
                  padding: "16px 18px",
                  borderRadius: 20,
                  background: "oklch(99.5% 0.004 70)",
                  border: "1px solid oklch(88% 0.01 70)",
                }}
              >
                <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 22, color: ORANGE_TEXT }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <strong style={{ fontFamily: DISPLAY }}>{title}</strong> {body}
                </span>
              </li>
            ))}
          </ol>
          <Link
            href="/studio"
            className="stepup-cta-pill"
            style={{
              alignSelf: "flex-start",
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: 18,
              padding: "18px 28px",
              borderRadius: 999,
              background: "oklch(63% 0.17 38)",
              color: "#fff",
              textDecoration: "none",
            }}
          >
            Go to your studio dashboard <span aria-hidden style={{ fontSize: 20 }}>→</span>
          </Link>
        </div>
        <aside
          aria-label="Your studio page"
          style={{ flex: "1 1 340px", minWidth: 0, maxWidth: 440, display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.14em", color: "oklch(45% 0.02 60)" }}>
            YOUR STUDIO PAGE
          </div>
          <StudioCard
            photoUrl={imageUrl(studio.photoId)}
            name={studio.name}
            where={suburb ? `${suburb.name} · ${suburb.area}` : studio.city}
            styles={studio.styles}
            about={studio.description}
            ownerName={user.name ?? ""}
          />
        </aside>
      </div>
      <FunnelFooter />
    </FunnelPage>
  );
}
