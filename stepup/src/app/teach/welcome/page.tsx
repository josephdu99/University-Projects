import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { firstName } from "@/lib/team";
import { formatClassWhen } from "@/lib/time";
import { musicPhrase, isMusic } from "@/lib/first-class";
import { C } from "@/lib/marketing-theme";
import { FunnelFooter, FunnelPage } from "@/components/first-class/FunnelChrome";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { ClearDrafts } from "@/components/onboarding/ClearDrafts";
import { TEACH_DRAFT_KEY } from "@/components/onboarding/draft-keys";
import { DoneTick, FactCard, Lede, PageTitle } from "@/components/onboarding/fields";

export const metadata = { title: "Your class is live, StepUp" };

/** The Live step: read back from the class that was actually saved. */
export default async function TeachWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string }>;
}) {
  const [user, { class: classId }] = await Promise.all([requireUser(), searchParams]);
  if (!classId) notFound();
  const c = await db.danceClass.findFirst({
    where: { id: classId, hostId: user.id },
    include: { series: { select: { frequency: true } } },
  });
  if (!c) notFound();

  const music = c.music && isMusic(c.music) ? musicPhrase(c.music) : null;
  const matchOn = [c.style.toLowerCase(), music, c.suburb].filter(Boolean).join(", ").replace(/, ([^,]*)$/, " and $1");
  const repeats = c.series ? (c.series.frequency === "FORTNIGHTLY" ? "Every 2 weeks" : "Every week") : "One-off";

  return (
    <FunnelPage>
      <ClearDrafts keys={[TEACH_DRAFT_KEY]} />
      <OnboardingHeader tag="FOR INSTRUCTORS" links={[{ href: "/teach", label: "YOUR DASHBOARD" }]} />
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "clamp(16px, 3vw, 32px) clamp(20px, 5vw, 48px) 96px", display: "flex", flexDirection: "column", gap: 22 }}>
        <DoneTick />
        <PageTitle>
          {c.title} is live, {firstName(user.name ?? "")}.
        </PageTitle>
        <Lede>
          {`Beginners who match on ${matchOn} will now see your class. You'll find its bookings on your dashboard.`}
        </Lede>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 12 }}>
          <FactCard label="FIRST CLASS" value={formatClassWhen(c.startTime, c.timezone)} />
          <FactCard label="FIRST-TIMER SPOTS" value={`${c.firstTimerSpots ?? c.capacity} of ${c.capacity}`} />
          <FactCard label="REPEATS" value={repeats} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Link
            href={`/first-class/${c.id}`}
            className="su-dark-pill"
            style={{ fontWeight: 700, fontSize: 16, padding: "16px 24px", borderRadius: 999, background: C.ink, color: "oklch(96% 0.025 75)", textDecoration: "none" }}
          >
            See your class page
          </Link>
          <Link
            href="/teach/classes/first-timer"
            style={{ fontWeight: 700, fontSize: 16, padding: "14px 22px", borderRadius: 999, border: `1.5px solid ${C.ink}`, color: C.ink, textDecoration: "none" }}
          >
            Create another class
          </Link>
          <Link href="/teach" className="stepup-text-link" style={{ alignSelf: "center", fontWeight: 700, fontSize: 15, color: C.ink, textDecoration: "none", padding: "0 6px" }}>
            Go to your dashboard →
          </Link>
        </div>
      </div>
      <FunnelFooter />
    </FunnelPage>
  );
}
