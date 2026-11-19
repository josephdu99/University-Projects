import { DISPLAY } from "@/lib/marketing-theme";
import { imageForStyle } from "@/lib/class-photo";
import { partnerTag } from "@/lib/class-form";
import { CARD, ORANGE } from "./fields";

/**
 * A class as beginners will see it on the match page, drawn from the form as
 * it is filled in. The price is the real one: there is no first-class
 * discount in checkout, so the preview doesn't promise one.
 */
export function ClassPreviewCard({
  title,
  style,
  partner,
  when,
  where,
  teacher,
  note,
  priceCents,
  photoUrl,
  hidePrice = false,
}: {
  title: string;
  style: string;
  partner: string;
  when: string;
  where: string;
  teacher: string;
  /** The teacher's note to first-timers, when there is one to show. */
  note?: string | null;
  priceCents: number;
  photoUrl?: string | null;
  /** A studio teacher's preview: the studio sets prices, not them. */
  hidePrice?: boolean;
}) {
  const img = photoUrl ?? imageForStyle(style || "salsa").src;
  return (
    <div
      style={{
        borderRadius: 24,
        overflow: "hidden",
        background: CARD,
        border: "1px solid oklch(88% 0.01 70)",
      }}
    >
      <div style={{ position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a stand-in or a local preview */}
        <img src={img} alt="" style={{ display: "block", width: "100%", aspectRatio: "16/11", objectFit: "cover" }} />
        <span
          style={{
            position: "absolute",
            left: 12,
            top: 12,
            fontSize: 12,
            fontWeight: 700,
            padding: "5px 10px",
            borderRadius: 999,
            background: ORANGE,
            color: "#fff",
          }}
        >
          First Timer
        </span>
        <span
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            fontSize: 12,
            fontWeight: 700,
            padding: "5px 10px",
            borderRadius: 999,
            background: CARD,
            whiteSpace: "nowrap",
          }}
        >
          {partnerTag(partner) ?? "No partner needed"}
        </span>
      </div>
      <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 21,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            overflowWrap: "anywhere",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 14.5, color: "oklch(46% 0.02 60)" }}>
          {when} · {where}
        </div>
        {note ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              padding: 14,
              borderRadius: 18,
              background: "oklch(22% 0.02 60)",
              color: "oklch(96% 0.025 75)",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "oklch(80% 0.1 50)" }}>
              YOUR TEACHER · {teacher.toUpperCase()}
            </span>
            <span style={{ fontSize: 14, lineHeight: 1.35, overflowWrap: "anywhere" }}>“{note}”</span>
          </div>
        ) : (
          <div style={{ fontSize: 14, color: "oklch(40% 0.02 60)" }}>With {teacher}</div>
        )}
        {!hidePrice && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, paddingTop: 4 }}>
          <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 19 }}>
            {priceCents > 0 ? `$${Math.round(priceCents / 100)}` : "Free"}
          </span>
          <span
            aria-hidden
            style={{
              fontWeight: 700,
              fontSize: 13.5,
              padding: "9px 15px",
              borderRadius: 999,
              background: "oklch(22% 0.02 60)",
              color: "oklch(96% 0.025 75)",
              whiteSpace: "nowrap",
            }}
          >
            View class →
          </span>
        </div>
        )}
      </div>
    </div>
  );
}
