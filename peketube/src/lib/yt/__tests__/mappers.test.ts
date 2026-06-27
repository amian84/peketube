import { describe, expect, it } from "vitest";
import {
  mapSearchItemToVideoDTO,
  mapVideoResource,
  parseIsoDuration,
} from "@/lib/yt/mappers";
import { isFresh } from "@/lib/db/cache";

describe("parseIsoDuration", () => {
  it("parses PT1M30S", () => {
    expect(parseIsoDuration("PT1M30S")).toBe(90);
  });
  it("returns undefined for invalid", () => {
    expect(parseIsoDuration(undefined)).toBeUndefined();
    expect(parseIsoDuration("")).toBeUndefined();
  });
});

describe("mapVideoResource", () => {
  it("maps minimal video", () => {
    const v = mapVideoResource({
      id: "abc",
      snippet: {
        title: "T",
        description: "D",
        channelId: "ch",
        channelTitle: "Ch",
        publishedAt: "2020-01-01T00:00:00Z",
        thumbnails: { default: { url: "https://x" } },
      },
      contentDetails: { duration: "PT10S" },
      statistics: { viewCount: "5" },
      status: { madeForKids: true },
    });
    expect(v.id).toBe("abc");
    expect(v.durationSec).toBe(10);
    expect(v.madeForKids).toBe(true);
    expect(v.embeddable).toBeUndefined();
  });

  it("maps status.embeddable", () => {
    const blocked = mapVideoResource({
      id: "no-embed",
      snippet: { title: "T" },
      status: { madeForKids: true, embeddable: false },
    });
    expect(blocked.embeddable).toBe(false);

    const ok = mapVideoResource({
      id: "embed",
      snippet: { title: "T" },
      status: { embeddable: true },
    });
    expect(ok.embeddable).toBe(true);
  });
});

describe("mapSearchItemToVideoDTO", () => {
  it("returns null without videoId", () => {
    expect(mapSearchItemToVideoDTO({ id: {}, snippet: {} })).toBeNull();
  });
});

describe("isFresh", () => {
  it("respects expiresAt", () => {
    expect(isFresh(Date.now() + 1000)).toBe(true);
    expect(isFresh(Date.now() - 1000)).toBe(false);
  });
});
