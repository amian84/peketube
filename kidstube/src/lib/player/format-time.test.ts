import { describe, expect, it } from "vitest";
import {
  formatPlayerTime,
  isYoutubeEmbedBlockedError,
} from "@/lib/player/format-time";

describe("formatPlayerTime", () => {
  it("formats under one hour as m:ss", () => {
    expect(formatPlayerTime(31)).toBe("0:31");
    expect(formatPlayerTime(430)).toBe("7:10");
  });

  it("formats one hour or more as h:mm:ss", () => {
    expect(formatPlayerTime(3661)).toBe("1:01:01");
  });
});

describe("isYoutubeEmbedBlockedError", () => {
  it("matches embed-blocked and unavailable codes", () => {
    expect(isYoutubeEmbedBlockedError(101)).toBe(true);
    expect(isYoutubeEmbedBlockedError(150)).toBe(true);
    expect(isYoutubeEmbedBlockedError(100)).toBe(true);
  });

  it("rejects unknown codes", () => {
    expect(isYoutubeEmbedBlockedError(0)).toBe(false);
  });
});
