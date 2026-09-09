import { findMark } from "@/lib/avatar-marks";
import { initialsOf } from "@/lib/style-chips";
import { C, DISPLAY } from "@/lib/marketing-theme";

/**
 * A person's avatar disc: their chosen line-art mark when they have one,
 * their initials when they do not.
 *
 * One component for both so callers never have to branch, and so an
 * instructor's mark follows them into every place an avatar is drawn
 * rather than only the page where they picked it.
 */
export function AvatarMark({
  name,
  mark,
  color,
  size,
  title,
}: {
  name: string;
  mark: string | null | undefined;
  color: string;
  size: number;
  /** Accessible name. Omit to render decoratively, which is usually right. */
  title?: string;
}) {
  const chosen = findMark(mark);

  return (
    <div
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
      style={{
        width: size,
        height: size,
        flex: "none",
        borderRadius: 999,
        background: color,
        color: C.onBrand,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: DISPLAY,
        fontWeight: size >= 80 ? 800 : 700,
        // Initials scale with the disc; the mark is drawn, so it just fills it.
        fontSize: Math.round(size * 0.38),
        letterSpacing: size >= 80 ? "-0.02em" : undefined,
      }}
    >
      {chosen ? (
        <svg
          width={Math.round(size * 0.46)}
          height={Math.round(size * 0.46)}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <path
            d={chosen.d}
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        initialsOf(name)
      )}
    </div>
  );
}
