import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { DANCE_STYLES } from "@/lib/class-form";
import { imageUrl } from "@/lib/images";
import { removeDraftPhotoAction, saveStudioDraftAction } from "@/lib/actions/admin-actions";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata = { title: "Studio draft, StepUp admin" };

/** Concierge set-up: the profile draft a studio approves on its Profile tab. */
export default async function AdminStudioDraftPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const studio = await db.studio.findUnique({
    where: { id },
    include: { photos: { orderBy: { sort: "asc" } }, owner: { select: { name: true, email: true } } },
  });
  if (!studio) notFound();
  const styles = studio.draftStyles.length ? studio.draftStyles : studio.styles;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Link href="/admin" className="text-sm font-medium text-ink-soft">
        ← Admin
      </Link>
      <div>
        <h1 className="text-2xl font-extrabold text-ink">{studio.name}: profile draft</h1>
        <p className="text-sm text-ink-soft">
          {studio.owner.name} ({studio.owner.email}).{" "}
          {studio.profileApprovedAt
            ? `Approved by the studio on ${studio.profileApprovedAt.toLocaleDateString("en-AU")}.`
            : studio.draftPreparedAt
              ? "Draft ready, waiting for the studio to approve it."
              : "No draft yet."}
        </p>
      </div>
      <Card className="flex flex-col gap-4 p-5">
        <form action={saveStudioDraftAction.bind(null, studio.id)} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">Bio (from their website and socials)</span>
            <textarea name="bio" maxLength={280} defaultValue={studio.draftBio ?? studio.description} rows={4} className="rounded-xl border border-border p-3" />
          </label>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-semibold text-ink">Styles</legend>
            <div className="flex flex-wrap gap-3">
              {DANCE_STYLES.map((s) => (
                <label key={s} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name="styles" value={s} defaultChecked={styles.includes(s)} />
                  {s}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">Add a photo (optional)</span>
            <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" />
          </label>
          <SubmitButton pendingLabel="Saving…">Save draft for the studio to approve</SubmitButton>
        </form>
        {studio.photos.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {studio.photos.map((p) => (
              <div key={p.id} className="flex flex-col items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(p.imageId)!} alt="" className="h-20 w-28 rounded-lg object-cover" />
                {p.draft ? (
                  <form action={removeDraftPhotoAction.bind(null, p.id)}>
                    <button type="submit" className="text-xs text-red-600 underline">
                      Remove draft photo
                    </button>
                  </form>
                ) : (
                  <span className="text-xs text-ink-soft">Live</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
