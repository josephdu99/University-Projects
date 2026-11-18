/**
 * Sydney suburbs for the first-timer matcher's "where" question.
 *
 * Taken from the design handoff, which asked for this to live in a data file
 * rather than a page script. Postcodes and areas are the real ones. The list
 * is Sydney only, because that is what the handoff supplied; a dancer
 * elsewhere can still answer the other two questions, and online classes
 * match wherever they are. A wider area means a bigger list here or an
 * address lookup service, not a change to anything that reads this.
 *
 * Pure and client-safe: the matcher's combobox searches it in the browser.
 */

export type Suburb = { name: string; postcode: string; area: string };

const RAW: [string, string, string][] = [
  ["Sydney", "2000", "City"], ["The Rocks", "2000", "City"], ["Haymarket", "2000", "City"],
  ["Ultimo", "2007", "City"], ["Chippendale", "2008", "City"], ["Darlington", "2008", "City"],
  ["Pyrmont", "2009", "City"], ["Surry Hills", "2010", "City"], ["Darlinghurst", "2010", "City"],
  ["Potts Point", "2011", "City"], ["Elizabeth Bay", "2011", "City"], ["Woolloomooloo", "2011", "City"],

  ["Redfern", "2016", "Inner South"], ["Waterloo", "2017", "Inner South"], ["Zetland", "2017", "Inner South"],
  ["Alexandria", "2015", "Inner South"], ["Rosebery", "2018", "Inner South"], ["Mascot", "2020", "Inner South"],
  ["Erskineville", "2043", "Inner South"],

  ["Newtown", "2042", "Inner West"], ["Enmore", "2042", "Inner West"], ["Camperdown", "2050", "Inner West"],
  ["Glebe", "2037", "Inner West"], ["Forest Lodge", "2037", "Inner West"], ["Annandale", "2038", "Inner West"],
  ["Rozelle", "2039", "Inner West"], ["Leichhardt", "2040", "Inner West"], ["Lilyfield", "2040", "Inner West"],
  ["Balmain", "2041", "Inner West"], ["Tempe", "2044", "Inner West"], ["St Peters", "2044", "Inner West"],
  ["Sydenham", "2044", "Inner West"], ["Five Dock", "2046", "Inner West"], ["Drummoyne", "2047", "Inner West"],
  ["Stanmore", "2048", "Inner West"], ["Petersham", "2049", "Inner West"], ["Lewisham", "2049", "Inner West"],
  ["Summer Hill", "2130", "Inner West"], ["Ashfield", "2131", "Inner West"], ["Burwood", "2134", "Inner West"],
  ["Strathfield", "2135", "Inner West"], ["Concord", "2137", "Inner West"], ["Rhodes", "2138", "Inner West"],
  ["Dulwich Hill", "2203", "Inner West"], ["Marrickville", "2204", "Inner West"], ["Arncliffe", "2205", "Inner West"],

  ["Paddington", "2021", "Eastern Suburbs"], ["Bondi Junction", "2022", "Eastern Suburbs"],
  ["Bronte", "2024", "Eastern Suburbs"], ["Waverley", "2024", "Eastern Suburbs"],
  ["Woollahra", "2025", "Eastern Suburbs"], ["Bondi", "2026", "Eastern Suburbs"],
  ["Bondi Beach", "2026", "Eastern Suburbs"], ["Edgecliff", "2027", "Eastern Suburbs"],
  ["Double Bay", "2028", "Eastern Suburbs"], ["Rose Bay", "2029", "Eastern Suburbs"],
  ["Randwick", "2031", "Eastern Suburbs"], ["Clovelly", "2031", "Eastern Suburbs"],
  ["Kingsford", "2032", "Eastern Suburbs"], ["Kensington", "2033", "Eastern Suburbs"],
  ["Coogee", "2034", "Eastern Suburbs"], ["Maroubra", "2035", "Eastern Suburbs"],

  ["North Sydney", "2060", "Lower North Shore"], ["Kirribilli", "2061", "Lower North Shore"],
  ["Crows Nest", "2065", "Lower North Shore"], ["St Leonards", "2065", "Lower North Shore"],
  ["Lane Cove", "2066", "Lower North Shore"], ["Mosman", "2088", "Lower North Shore"],
  ["Neutral Bay", "2089", "Lower North Shore"], ["Cremorne", "2090", "Lower North Shore"],

  ["Chatswood", "2067", "North Shore"], ["Hornsby", "2077", "North Shore"],
  ["Ryde", "2112", "Northern Suburbs"], ["Epping", "2121", "Northern Suburbs"],
  ["Manly", "2095", "Northern Beaches"], ["Dee Why", "2099", "Northern Beaches"],

  ["Homebush", "2140", "West"], ["Parramatta", "2150", "West"], ["Blacktown", "2148", "West"],
  ["Castle Hill", "2154", "Hills District"], ["Penrith", "2750", "West"],
  ["Liverpool", "2170", "South West"], ["Bankstown", "2200", "South West"],

  ["Rockdale", "2216", "St George"], ["Kogarah", "2217", "St George"], ["Hurstville", "2220", "St George"],
  ["Cronulla", "2230", "Sutherland Shire"], ["Sutherland", "2232", "Sutherland Shire"],
];

export const SUBURBS: Suburb[] = RAW.map(([name, postcode, area]) => ({
  name,
  postcode,
  area,
}));

/**
 * Shown under the suburbs that have a studio, when the box is empty. These
 * are the handoff's "popular" picks: well-known places people are likely to
 * live or work near, so an empty box offers something useful straight away.
 */
const POPULAR = ["Sydney", "Glebe", "Paddington", "Bondi", "Leichhardt", "Chatswood"];

const BY_NAME = new Map(SUBURBS.map((s) => [s.name.toLowerCase(), s]));

/** The suburb with exactly this name, ignoring case and outer spaces. */
export function findSuburb(name: string | null | undefined): Suburb | null {
  return BY_NAME.get(String(name ?? "").trim().toLowerCase()) ?? null;
}

const MAX_RESULTS = 8;

/**
 * What the combobox lists for a query.
 *
 * Empty: the suburbs that have a studio first, then a few popular ones.
 * Otherwise, ranked as the handoff specifies: a name or postcode that starts
 * with the query, then a name with any word starting with it, then a name
 * that merely contains it. Alphabetical within each tier, at most eight.
 */
export function searchSuburbs(
  query: string,
  studioSuburbs: readonly string[] = [],
): Suburb[] {
  const q = query.trim().toLowerCase();

  if (!q) {
    const withStudio = SUBURBS.filter((s) => studioSuburbs.includes(s.name));
    const popular = SUBURBS.filter(
      (s) => POPULAR.includes(s.name) && !studioSuburbs.includes(s.name),
    );
    return [...withStudio, ...popular];
  }

  const tier = (s: Suburb) => {
    const n = s.name.toLowerCase();
    if (n.startsWith(q) || s.postcode.startsWith(q)) return 0;
    if (n.split(" ").some((w) => w.startsWith(q))) return 1;
    if (n.includes(q)) return 2;
    return null;
  };

  return SUBURBS.flatMap((s) => {
    const t = tier(s);
    return t === null ? [] : [{ s, t }];
  })
    .sort((a, b) => a.t - b.t || a.s.name.localeCompare(b.s.name))
    .slice(0, MAX_RESULTS)
    .map((x) => x.s);
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const MATCHERS = SUBURBS.map((s) => ({
  suburb: s,
  re: new RegExp(`(?:^|[^a-z])${escapeRegExp(s.name.toLowerCase())}(?![a-z])`, "g"),
}));

/**
 * Which suburb a free-text address is in, if it names one.
 *
 * Studio addresses and class locations are typed by hosts, so this reads the
 * text rather than trusting a field. Australian addresses put the street
 * before the suburb, so when two suburb names appear, "120 Parramatta Rd,
 * Leichhardt", the one that comes last wins; at the same position, the
 * longer, "Bondi Beach" over "Bondi". Returns null when no Sydney suburb is
 * named, which is the honest answer for a Melbourne address.
 */
export function suburbFromAddress(text: string | null | undefined): Suburb | null {
  const t = String(text ?? "").toLowerCase();
  if (!t) return null;

  let best: { suburb: Suburb; end: number } | null = null;
  for (const { suburb, re } of MATCHERS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t))) {
      const end = m.index + m[0].length;
      if (
        !best ||
        end > best.end ||
        (end === best.end && suburb.name.length > best.suburb.name.length)
      ) {
        best = { suburb, end };
      }
    }
  }
  return best?.suburb ?? null;
}
