import { db } from "@/lib/db";
import { requireStudioAccess } from "@/lib/studio-access";
import { isPolicy, NO_SHOW_PREPAY_AT, NO_SHOW_WARN_AT, NO_SHOW_WINDOW_DAYS, type PolicyId } from "@/lib/policies";
import { currentTerms } from "@/lib/terms";
import { wwccCurrent } from "@/lib/wwcc";
import { documentUrl } from "@/lib/documents";
import { shortDate } from "@/lib/studio-format";
import { TabTitle } from "@/components/studio/tabs/TabTitle";
import { HealthLinkForm, KidsToggle, PolicyPicker, TermsForm } from "@/components/studio/tabs/PoliciesForms";

export const metadata = { title: "Policies, StepUp" };

/**
 * Policies: the late-cancellation preset StepUp enforces, the no-show rule,
 * the studio's terms (versioned, accepted once per version), an optional
 * health form link, and kids' classes.
 */
export default async function StudioPoliciesPage() {
  const { studio } = await requireStudioAccess();
  const tz = studio.timezone;
  const policy: PolicyId = isPolicy(studio.cancelPolicy) ? studio.cancelPolicy : "STANDARD";
  const [terms, teachers] = await Promise.all([
    currentTerms(studio.id),
    db.studioMember.findMany({ where: { studioId: studio.id, teaches: true }, select: { name: true, wwccNumber: true, wwccExpiry: true, wwccVerifiedAt: true } }),
  ]);
  const accepted = terms ? await db.termsAcceptance.count({ where: { termsId: terms.id } }) : 0;
  const now = new Date();
  const verified = teachers.filter((t) => wwccCurrent(t, now));

  return (
    <>
      <TabTitle kicker="Policies" title="Your rules, enforced for you." />

      <section aria-labelledby="noshow-title" className="sd-card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
        <div>
          <h2 id="noshow-title" className="sd-h3">
            Late cancellations and no-shows
          </h2>
          <p className="sd-hint" style={{ margin: "4px 0 0" }}>
            Pick a preset. StepUp shows it at booking and in the confirmation, and enforces it, so teachers never have to argue. You can override
            it for a single class when you create it.
          </p>
        </div>
        <PolicyPicker current={policy} />
        <div style={{ padding: "14px 16px", borderRadius: 16, background: "oklch(96% 0.01 70)", fontSize: 14.5 }}>
          <strong>No-shows:</strong>{" "}
          {`marked on the class list. After a student's ${ordinal(NO_SHOW_WARN_AT)} no-show in ${NO_SHOW_WINDOW_DAYS} days they get a warning. After the ${ordinal(
            NO_SHOW_PREPAY_AT,
          )}, they must prepay with no late refund at your studio.`}
        </div>
      </section>

      <section aria-labelledby="terms-title" className="sd-card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
        <div>
          <h2 id="terms-title" className="sd-h3">
            Studio terms
          </h2>
          <p className="sd-hint" style={{ margin: "4px 0 0" }}>
            Students accept once per studio at their first booking, and again only when you change the terms. We record which version they
            accepted and when.
          </p>
        </div>
        <div>
          {terms ? (
            <span className="sd-chip" style={{ background: "oklch(95% 0.012 70)", color: "oklch(30% 0.02 60)", fontSize: 13 }}>
              {`Version ${terms.version} · updated ${shortDate(terms.publishedAt, tz)} · accepted by ${accepted} ${accepted === 1 ? "student" : "students"}`}
            </span>
          ) : (
            <span className="sd-chip" style={{ background: "oklch(94% 0.06 85)", color: "oklch(40% 0.1 70)", fontSize: 13 }}>
              No terms yet. Students book without accepting any.
            </span>
          )}
          {terms?.mode === "UPLOAD" && terms.document && (
            <a href={documentUrl(terms.document.id)!} target="_blank" rel="noopener" style={{ marginLeft: 10, fontSize: 14 }}>
              {terms.document.filename}
            </a>
          )}
        </div>
        <TermsForm
          current={
            terms
              ? {
                  mode: terms.mode === "UPLOAD" ? "UPLOAD" : "TEMPLATE",
                  waiver: terms.waiver,
                  conduct: terms.conduct,
                  cancellation: terms.cancellation,
                  fileName: terms.document?.filename ?? null,
                }
              : null
          }
          nextVersion={(terms?.version ?? 0) + 1}
          policy={policy}
        />
        <span className="sd-hint">{`Students will be asked to accept version ${(terms?.version ?? 0) + 1} at their next booking.`}</span>
        <div style={{ borderTop: "1px solid oklch(93% 0.008 70)", paddingTop: 14 }}>
          <HealthLinkForm url={studio.healthFormUrl} />
        </div>
      </section>

      <section aria-labelledby="kids-title" className="sd-card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 id="kids-title" className="sd-h3">
          Kids&apos; classes
        </h2>
        <KidsToggle on={studio.kidsClasses} />
        {studio.kidsClasses ? (
          <>
            <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6, fontSize: 14.5 }}>
              <li>
                Bookings come from a <strong>parent or guardian account</strong>, with a child profile, the guardian&apos;s consent and an emergency
                contact. Guardian booking isn&apos;t open on StepUp yet, so kids&apos; classes show on your timetable but can&apos;t be booked here
                until it is.
              </li>
              <li>
                Teachers need a <strong>Working With Children Check number</strong>, verified with the NSW Office of the Children&apos;s Guardian
                before the class goes live. Add it on the Team tab.
              </li>
              <li>We store each check&apos;s expiry date and remind you and the teacher 30 days before it runs out.</li>
            </ul>
            <div className="sd-hint">
              {teachers.length === 0
                ? "No teachers on your team yet."
                : `${verified.length} of ${teachers.length} ${teachers.length === 1 ? "teacher has" : "teachers have"} a verified check${
                    verified.length ? `: ${verified.map((t) => t.name).join(", ")}` : ""
                  }.`}
            </div>
          </>
        ) : (
          <p className="sd-hint" style={{ margin: 0 }}>
            Turn this on to list kids&apos; classes. Guardian accounts and Working With Children Checks are then required.
          </p>
        )}
      </section>
    </>
  );
}

function ordinal(n: number) {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
}
