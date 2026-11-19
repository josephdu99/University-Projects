import { db } from "@/lib/db";
import { requireStudioAccess } from "@/lib/studio-access";
import { studioProfileFacts } from "@/lib/studio-profile";
import { completeness, profileChecklist, tierFor, TIER_LABEL } from "@/lib/profile-completeness";
import { DANCE_STYLES } from "@/lib/class-form";
import { imageUrl } from "@/lib/images";
import { TabTitle } from "@/components/studio/tabs/TabTitle";
import { LevelsForm, ProfileDraftForm, TemplatesForm, VenuesForm } from "@/components/studio/tabs/ProfileForms";

export const metadata = { title: "Studio profile, StepUp" };

/**
 * Profile: the studio page students see. The completeness meter (80% unlocks
 * Featured, 100% Elite, and it lifts the studio's classes in matching), the
 * concierge draft to approve, the level mapping onto StepUp's one scale,
 * description templates, and saved venues.
 */
export default async function StudioProfilePage() {
  const { studio } = await requireStudioAccess();
  const [facts, photos, levels, templates, venues] = await Promise.all([
    studioProfileFacts([studio.id]),
    db.studioPhoto.findMany({ where: { studioId: studio.id }, orderBy: [{ draft: "asc" }, { sort: "asc" }] }),
    db.levelName.findMany({ where: { studioId: studio.id }, orderBy: { createdAt: "asc" }, select: { name: true, scale: true } }),
    db.classTemplate.findMany({ where: { studioId: studio.id }, select: { style: true, scale: true, description: true, wear: true, plan: true } }),
    db.venue.findMany({
      where: { studioId: studio.id },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { classes: { where: { startTime: { gte: new Date() }, cancelledAt: null } } } } },
    }),
  ]);
  const checks = profileChecklist(facts.get(studio.id)!);
  const pct = completeness(checks);
  const tier = tierFor(pct);
  const hasDraft = Boolean(studio.draftPreparedAt && (studio.draftBio || studio.draftStyles.length || photos.some((p) => p.draft)));
  const approved = Boolean(studio.profileApprovedAt);
  const styles = studio.styles.length ? studio.styles : DANCE_STYLES;

  return (
    <>
      <TabTitle kicker="Profile" title="Your studio page" />

      <section aria-labelledby="meter-title" className="sd-card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 id="meter-title" className="sd-h3">
              Profile {pct}% complete
            </h2>
            <p className="sd-hint" style={{ margin: "4px 0 0" }}>
              More complete profiles rank higher in search. 80% unlocks Featured, and 100% unlocks Elite.
            </p>
          </div>
          <span
            className="sd-chip"
            style={
              tier === "ELITE"
                ? { background: "oklch(22% 0.02 60)", color: "oklch(88% 0.12 85)" }
                : tier === "FEATURED"
                  ? { background: "oklch(94% 0.06 85)", color: "oklch(40% 0.1 70)" }
                  : { background: "oklch(95% 0.012 70)", color: "oklch(35% 0.02 60)" }
            }
          >
            {TIER_LABEL[tier]}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Profile completeness"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          style={{ height: 12, borderRadius: 999, background: "oklch(93% 0.01 70)", overflow: "hidden", position: "relative" }}
        >
          <div style={{ width: `${pct}%`, height: "100%", background: "oklch(66% 0.19 35)", borderRadius: 999 }} />
          <div aria-hidden style={{ position: "absolute", left: "80%", top: 0, bottom: 0, width: 2, background: "oklch(99% 0.005 70)" }} />
        </div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "8px 18px" }}>
          {checks.map((x) => (
            <li key={x.label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14.5 }}>
              <span
                aria-hidden
                style={{
                  flex: "none",
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 800,
                  background: x.done ? "oklch(93% 0.06 150)" : "oklch(94% 0.01 70)",
                  color: x.done ? "oklch(35% 0.1 150)" : "oklch(55% 0.02 60)",
                }}
              >
                {x.done ? "✓" : "·"}
              </span>
              <span style={{ color: x.done ? undefined : "oklch(42% 0.02 60)" }}>{x.label}</span>
              <span className="sd-sr">{x.done ? "done" : "not done yet"}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="draft-title" className="sd-card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 id="draft-title" className="sd-h3">
              {hasDraft ? "Your profile draft is ready" : "Bio, photos and styles"}
            </h2>
            <p className="sd-hint" style={{ margin: "4px 0 0" }}>
              {hasDraft
                ? "The StepUp team set this up from your website and socials. Check it, change anything, then approve it to go live."
                : approved
                  ? "What students read on your studio page."
                  : "Write a short bio, add photos and pick your styles, then approve your page."}
            </p>
          </div>
          {approved && !hasDraft && (
            <span className="sd-chip" style={{ background: "oklch(93% 0.06 150)", color: "oklch(32% 0.08 150)" }}>
              Approved and live
            </span>
          )}
        </div>
        <ProfileDraftForm
          bio={(hasDraft && studio.draftBio) || studio.description}
          styles={hasDraft && studio.draftStyles.length ? studio.draftStyles : studio.styles}
          allStyles={DANCE_STYLES}
          photos={photos.map((p) => ({ id: p.id, src: imageUrl(p.imageId)!, draft: p.draft }))}
          approved={approved}
          hasDraft={hasDraft}
        />
      </section>

      <section aria-labelledby="levels-title" className="sd-card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        <div>
          <h2 id="levels-title" className="sd-h3">
            Your levels, on one scale
          </h2>
          <p className="sd-hint" style={{ margin: "4px 0 0" }}>
            StepUp uses one level scale for every studio: Absolute beginner, Beginner, Improver, Intermediate, Advanced. Map your own level names
            once so students can compare studios fairly.
          </p>
        </div>
        <LevelsForm levels={levels} />
      </section>

      <section aria-labelledby="tpl-title" className="sd-card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        <div>
          <h2 id="tpl-title" className="sd-h3">
            Class description templates
          </h2>
          <p className="sd-hint" style={{ margin: "4px 0 0" }}>
            One per style and level. A new class starts from these, so it never starts blank.
          </p>
        </div>
        <TemplatesForm styles={styles} saved={templates} />
      </section>

      <section aria-labelledby="venues-title" className="sd-card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <h2 id="venues-title" className="sd-h3">
            Saved venues
          </h2>
          <p className="sd-hint" style={{ margin: "4px 0 0" }}>
            Used when you create a class or move one.
          </p>
        </div>
        <VenuesForm
          venues={[
            { id: "studio", name: studio.name, address: `${studio.address}, ${studio.city}`, removable: false },
            ...venues.map((v) => ({ id: v.id, name: v.name, address: v.address, removable: v._count.classes === 0 })),
          ]}
        />
      </section>
    </>
  );
}
