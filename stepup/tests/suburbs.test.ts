import { describe, it, expect } from "vitest";
import {
  SUBURBS,
  findSuburb,
  searchSuburbs,
  suburbFromAddress,
} from "@/lib/suburbs";

const names = (xs: { name: string }[]) => xs.map((x) => x.name);

describe("the suburb list", () => {
  it("has the handoff's Sydney suburbs, each once, with a real-looking postcode", () => {
    // The handoff's prose says "about 95"; its data has 88.
    expect(SUBURBS.length).toBeGreaterThanOrEqual(88);
    expect(new Set(names(SUBURBS)).size).toBe(SUBURBS.length);
    for (const s of SUBURBS) expect(s.postcode).toMatch(/^2\d{3}$/);
  });

  it("finds a suburb by name, whatever the case", () => {
    expect(findSuburb("newtown")?.postcode).toBe("2042");
    expect(findSuburb("  Surry Hills ")?.area).toBe("City");
    expect(findSuburb("Newt")).toBeNull();
    expect(findSuburb("")).toBeNull();
  });
});

describe("searchSuburbs", () => {
  it("puts suburbs with a studio first when the box is empty, then popular ones", () => {
    const list = names(searchSuburbs("", ["Newtown", "Surry Hills"]));
    // Studio suburbs in list order, then the popular picks.
    expect(list.slice(0, 2)).toEqual(["Surry Hills", "Newtown"]);
    expect(list).toContain("Glebe");
    expect(list).toContain("Chatswood");
  });

  it("does not list a studio suburb twice when it is also popular", () => {
    const list = names(searchSuburbs("", ["Glebe"]));
    expect(list.filter((n) => n === "Glebe")).toHaveLength(1);
    expect(list[0]).toBe("Glebe");
  });

  it("ranks a name that starts with the query first", () => {
    expect(names(searchSuburbs("new"))[0]).toBe("Newtown");
  });

  it("matches a postcode", () => {
    expect(names(searchSuburbs("2042"))).toEqual(["Enmore", "Newtown"]);
    expect(names(searchSuburbs("2010"))).toEqual(["Darlinghurst", "Surry Hills"]);
  });

  it("then a word in the name that starts with it, then a name containing it", () => {
    // "Bondi Junction" starts with "bondi"; "North Sydney" has a word
    // starting with "syd"; "Haymarket" merely contains "mar".
    expect(names(searchSuburbs("hills"))).toEqual(["Surry Hills"]);
    // Sydenham and Sydney both start with "syd", so they share the first
    // tier, alphabetically; North Sydney only has a word that does.
    expect(names(searchSuburbs("syd"))).toEqual(["Sydenham", "Sydney", "North Sydney"]);
    const mar = names(searchSuburbs("mar"));
    expect(mar.indexOf("Marrickville")).toBeLessThan(mar.indexOf("Haymarket"));
  });

  it("returns at most eight", () => {
    expect(searchSuburbs("a").length).toBe(8);
  });

  it("returns nothing for a place that is not on the list", () => {
    expect(searchSuburbs("Fitzroy")).toEqual([]);
  });
});

describe("suburbFromAddress", () => {
  it("reads the suburb out of a typed address", () => {
    expect(suburbFromAddress("12 Beat St, Surry Hills")?.name).toBe("Surry Hills");
    expect(suburbFromAddress("88 Rhythm Ave, Newtown NSW 2042")?.name).toBe("Newtown");
  });

  it("takes the suburb, not a street named after another one", () => {
    expect(suburbFromAddress("120 Parramatta Rd, Leichhardt")?.name).toBe("Leichhardt");
  });

  it("prefers the longer name at the same place", () => {
    expect(suburbFromAddress("1 Miller St, North Sydney")?.name).toBe("North Sydney");
    expect(suburbFromAddress("Campbell Pde, Bondi Beach")?.name).toBe("Bondi Beach");
  });

  it("does not match inside another word", () => {
    // "Rydalmere" contains "Ryde" only as a fragment.
    expect(suburbFromAddress("Victoria Rd, Rydalmere")).toBeNull();
  });

  it("returns null for somewhere that is not in Sydney", () => {
    expect(suburbFromAddress("5 Grand Jete Ln, Fitzroy")).toBeNull();
    expect(suburbFromAddress(null)).toBeNull();
  });
});
