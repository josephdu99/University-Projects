/**
 * Class description templates, one per style and level, so a new class never
 * starts blank. A studio's own edits (ClassTemplate rows) take precedence;
 * these are StepUp's starting point.
 */
import { scaleLabel } from "@/lib/levels";

export type TemplateText = { description: string; wear: string; plan: string };

export function defaultTemplate(style: string, scale: string): TemplateText {
  const s = style.trim() || "Dance";
  const level = scaleLabel(scale || "BEGINNER").toLowerCase();
  const people = level.endsWith("beginner") ? `${level}s` : `${level} dancers`;
  return {
    description: `${s} for ${people}. Small steps, lots of repetition, and music you’ll want to hear again. Come alone or bring a friend.`,
    wear: /heels/i.test(s)
      ? "Comfy clothes. Bring heels you can move in, or start in sneakers."
      : "Anything comfy. Smooth-soled shoes, or just socks.",
    plan: "0–15 min: warm-up and the basic step. 15–40 min: one new move, broken down. 40–60 min: put it together to music.",
  };
}

export function templateFor(
  style: string,
  scale: string,
  saved: { style: string; scale: string; description: string; wear: string; plan: string }[],
): TemplateText & { saved: boolean } {
  const own = saved.find((t) => t.style === style && t.scale === scale);
  return own
    ? { description: own.description, wear: own.wear, plan: own.plan, saved: true }
    : { ...defaultTemplate(style, scale), saved: false };
}
