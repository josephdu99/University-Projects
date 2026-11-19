/**
 * Stand-in photography per style, so a class card is never a grey box.
 *
 * These are the handoff's own pictures. They are decorative: the alt text
 * describes what is in the frame and never claims the people in it are this
 * class's dancers, because they are not. Once studios can upload their own
 * photos, this is the one place that has to change.
 */
const STYLE_PHOTOS: { match: string[]; src: string; alt: string }[] = [
  {
    // Partner styles taught in a studio, as the handoff pairs it with Bachata.
    match: ["bachata", "kizomba", "tango"],
    src: "/photos/intermediate-salsa.png",
    alt: "Couples practising a partner dance in a bright studio",
  },
  {
    match: ["salsa", "reggaeton"],
    src: "/photos/sdc-salsa-social.jpg",
    alt: "A couple dancing salsa at a social",
  },
  {
    match: [
      "hip hop",
      "hiphop",
      "breaking",
      "waacking",
      "house",
      "heels",
      "afrobeats",
      "dancehall",
      "k-pop",
    ],
    src: "/photos/sdc-hiphop-jam.jpg",
    alt: "A hip hop class mid-routine",
  },
];

const FALLBACK = {
  src: "/photos/sdc-ballet-stage.jpg",
  alt: "Dancers rehearsing in a studio",
};

export function imageForStyle(style: string): { src: string; alt: string } {
  const s = style.trim().toLowerCase();
  return STYLE_PHOTOS.find((p) => p.match.includes(s)) ?? FALLBACK;
}

/**
 * The picture for a class card: the studio's own photo when it uploaded one,
 * otherwise the stand-in for its style. `uploaded` tells the card to show it
 * as stored, since it was already resized on the way in.
 */
export function classImage(c: { style: string; photoUrl?: string | null; studioName?: string | null }): {
  src: string;
  alt: string;
  uploaded: boolean;
} {
  if (c.photoUrl) {
    return { src: c.photoUrl, alt: c.studioName ? `Inside ${c.studioName}` : "The studio", uploaded: true };
  }
  return { ...imageForStyle(c.style), uploaded: false };
}
