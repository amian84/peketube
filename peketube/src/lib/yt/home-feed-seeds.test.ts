import { describe, expect, it } from "vitest";
import {
  getHomeSeedQueries,
  homeFeedSeedPack,
  queryLanguageForRegion,
} from "@/lib/yt/home-feed-seeds";

describe("home-feed-seeds", () => {
  it("maps region to query language", () => {
    expect(queryLanguageForRegion("mx")).toBe("es");
    expect(queryLanguageForRegion("US")).toBe("en");
    expect(queryLanguageForRegion("BR")).toBe("pt");
    expect(queryLanguageForRegion("ZZ")).toBe("es");
  });

  it("uses generic cartoon queries without fixed brand names", () => {
    const pack = homeFeedSeedPack("ES");
    const joined = pack.cartoons.join(" ").toLowerCase();
    expect(joined).toContain("dibujos animados");
    expect(joined).not.toMatch(/\bdoraemon\b/);
    expect(joined).not.toMatch(/\bpeppa\b/);
  });

  it("returns different packs per language region", () => {
    const es = getHomeSeedQueries("cartoons", "ES").join(" ").toLowerCase();
    const us = getHomeSeedQueries("cartoons", "US").join(" ").toLowerCase();
    expect(es).toMatch(/dibujos|infantil|niños/);
    expect(us).toMatch(/kids|cartoon/);
    expect(es).not.toMatch(/\bkids cartoons\b/);
  });

  it("merges cartoons and music for all chip", () => {
    const all = getHomeSeedQueries("all", "ES");
    const cartoons = getHomeSeedQueries("cartoons", "ES");
    const music = getHomeSeedQueries("music", "ES");
    expect(all.length).toBeGreaterThan(cartoons.length);
    expect(all.some((q) => music.includes(q))).toBe(true);
  });
});
