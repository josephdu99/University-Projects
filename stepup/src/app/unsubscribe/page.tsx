import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { checkUnsubscribe } from "@/lib/signed-links";
import { optOutFromLink } from "@/lib/opt-out";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { FunnelPage, Wordmark } from "@/components/first-class/FunnelChrome";

export const metadata = { title: "Stop offers, StepUp" };

async function stopAction(formData: FormData) {
  "use server";
  const s = (k: string) => String(formData.get(k) ?? "");
  await optOutFromLink(s("u"), s("s"), s("sig"));
  revalidatePath("/unsubscribe");
}

/**
 * "Stop offers from this studio": asks before it acts, so a link preview or
 * a mail scanner opening it changes nothing. Mail apps' one-click
 * unsubscribe posts to /api/unsubscribe instead.
 */
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ u?: string; s?: string; sig?: string }> }) {
  const { u = "", s = "", sig = "" } = await searchParams;
  const valid = checkUnsubscribe(u, s, sig);
  const [studio, opted] = valid
    ? await Promise.all([
        db.studio.findUnique({ where: { id: s }, select: { name: true } }),
        db.studioOptOut.findUnique({ where: { studioId_userId: { studioId: s, userId: u } } }),
      ])
    : [null, null];

  return (
    <FunnelPage>
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "40px clamp(20px, 5vw, 32px) 80px", display: "flex", flexDirection: "column", gap: 20 }}>
        <Wordmark size={20} />
        {!valid || !studio ? (
          <p style={{ fontSize: 17 }}>This link isn&apos;t valid. If you keep getting offers you don&apos;t want, reply to one and the studio will take you off.</p>
        ) : opted ? (
          <>
            <h1 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 800, fontSize: 34, letterSpacing: "-0.03em" }}>Done.</h1>
            <p style={{ margin: 0, fontSize: 17, color: C.inkSoft }}>
              {`You won't get offers or course updates from ${studio.name} through StepUp any more. Booking confirmations and class changes still come, because they're about classes you've booked.`}
            </p>
          </>
        ) : (
          <form action={stopAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <input type="hidden" name="u" value={u} />
            <input type="hidden" name="s" value={s} />
            <input type="hidden" name="sig" value={sig} />
            <h1 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 800, fontSize: 34, letterSpacing: "-0.03em" }}>{`Stop offers from ${studio.name}?`}</h1>
            <p style={{ margin: 0, fontSize: 17, color: C.inkSoft }}>
              Pass offers and course updates from this studio stop. Booking confirmations and class changes still come.
            </p>
            <button
              type="submit"
              style={{ alignSelf: "flex-start", cursor: "pointer", border: 0, fontFamily: DISPLAY, fontWeight: 700, fontSize: 17, padding: "15px 26px", borderRadius: 999, background: C.ink, color: C.heroCream }}
            >
              Stop offers
            </button>
          </form>
        )}
      </div>
    </FunnelPage>
  );
}
