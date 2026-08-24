import { C, DISPLAY } from "@/lib/marketing-theme";
import { avatarHue, initialsOf } from "@/lib/style-chips";
import type { Face } from "@/lib/host-data";

/**
 * Overlapping initials avatars.
 *
 * Initials alone tell a screen reader nothing, so the stack itself is hidden
 * and the caller always renders real names beside it — see `describeFaces`.
 */
export function AvatarStack({
  faces,
  total,
  size = 28,
  ringColor = C.card,
}: {
  faces: Face[];
  /** Total people represented, so an overflow "+N" bubble can be shown. */
  total?: number;
  size?: number;
  ringColor?: string;
}) {
  const overflow = Math.max(0, (total ?? faces.length) - faces.length);

  return (
    <div style={{ display: "flex" }} aria-hidden>
      {faces.map((face, i) => {
        const hue = avatarHue(face.id);
        return (
          <div
            key={face.id}
            style={{
              width: size,
              height: size,
              borderRadius: 999,
              background: `oklch(89% 0.055 ${hue})`,
              color: `oklch(38% 0.09 ${hue})`,
              border: `2px solid ${ringColor}`,
              marginLeft: i === 0 ? 0 : -8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: size <= 28 ? 11 : 12,
              fontWeight: 700,
              flex: "none",
            }}
          >
            {initialsOf(face.name)}
          </div>
        );
      })}
      {overflow > 0 && (
        <div
          style={{
            minWidth: size,
            height: size,
            padding: "0 6px",
            borderRadius: 999,
            background: C.barTrack,
            color: C.inkSoft,
            border: `2px solid ${ringColor}`,
            marginLeft: -8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: DISPLAY,
            fontSize: 11,
            fontWeight: 700,
            flex: "none",
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

/**
 * "Ana and Tom", "Ana, Tom and 4 more" — the accessible half of a stack.
 * Uses first names, which is what a host would say out loud.
 */
export function describeFaces(faces: Face[], total: number): string {
  const names = faces.map((f) => f.name.trim().split(/\s+/)[0]);
  const rest = total - names.length;

  if (names.length === 0) return "";
  if (names.length === 1) {
    return rest > 0 ? `${names[0]} and ${rest} more` : names[0];
  }

  const head = names.slice(0, -1).join(", ");
  const tail = names[names.length - 1];
  const listed = `${head} and ${tail}`;
  return rest > 0 ? `${listed} and ${rest} more` : listed;
}
