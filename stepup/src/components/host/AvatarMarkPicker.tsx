"use client";

import { AVATAR_MARKS, MARK_COLORS } from "@/lib/avatar-marks";
import { AvatarMark } from "@/components/ui/AvatarMark";
import { C } from "@/lib/marketing-theme";

/**
 * The two controls that make up an instructor's avatar: the mark, and the
 * disc it sits on. Rendered together with a live preview, because picking a
 * mark without seeing it on its colour is guesswork.
 *
 * Both write to hidden inputs so the surrounding form posts them with
 * everything else, and one Save covers the whole profile.
 */
export function AvatarMarkPicker({
  name,
  mark,
  color,
  onMarkChange,
  onColorChange,
}: {
  name: string;
  mark: string;
  color: string;
  onMarkChange: (mark: string) => void;
  onColorChange: (color: string) => void;
}) {
  return (
    <>
      <input type="hidden" name="avatarMark" value={mark} />
      <input type="hidden" name="avatarColor" value={color} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 22,
          flexWrap: "wrap",
        }}
      >
        <AvatarMark name={name} mark={mark} color={color} size={72} />
        <div>
          <span
            id="mark-label"
            style={{
              display: "block",
              fontSize: 13.5,
              fontWeight: 600,
              color: "oklch(38% 0.02 60)",
              marginBottom: 5,
            }}
          >
            Avatar mark
          </span>
          <p style={{ fontSize: 13.5, color: C.label, margin: "0 0 12px" }}>
            One mark, shown next to your name in listings.
          </p>
          <div
            role="radiogroup"
            aria-labelledby="mark-label"
            style={{ display: "flex", flexWrap: "wrap", gap: 10 }}
          >
            {AVATAR_MARKS.map((m) => {
              const on = m.id === mark;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={m.name}
                  title={m.name}
                  onClick={() => onMarkChange(m.id)}
                  style={{
                    width: 46,
                    height: 46,
                    flex: "none",
                    borderRadius: 14,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    background: on ? C.nudgeBg : C.bg,
                    border: `1.5px solid ${on ? C.brand : "oklch(90% 0.012 70)"}`,
                    color: on ? C.brandHover : "oklch(40% 0.02 60)",
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d={m.d}
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 26 }}>
        <span
          id="mark-colour-label"
          style={{
            display: "block",
            fontSize: 13.5,
            fontWeight: 600,
            color: "oklch(38% 0.02 60)",
            marginBottom: 5,
          }}
        >
          Avatar colour
        </span>
        <p style={{ fontSize: 13.5, color: C.label, margin: "0 0 12px" }}>
          The disc your mark sits on.
        </p>
        <div
          role="radiogroup"
          aria-labelledby="mark-colour-label"
          style={{ display: "flex", flexWrap: "wrap", gap: 12 }}
        >
          {MARK_COLORS.map((c, i) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={`Avatar colour ${i + 1}`}
              onClick={() => onColorChange(c)}
              style={{
                flex: "none",
                padding: 3,
                borderRadius: 999,
                cursor: "pointer",
                background: "none",
                border: `2px solid ${color === c ? C.brand : "transparent"}`,
              }}
            >
              <span
                style={{
                  display: "block",
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  background: c,
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
