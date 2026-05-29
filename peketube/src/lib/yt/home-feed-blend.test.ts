import { describe, expect, it } from "vitest";
import {
  homeFeedGenericBudget,
  homeFeedHistoryBudget,
  interleaveHistoryAndGeneric,
} from "@/lib/yt/home-feed-blend";
import type { VideoDTO } from "@/lib/yt/types";

function v(id: string): VideoDTO {
  return {
    id,
    title: id,
    description: "",
    channelId: "c",
    channelTitle: "C",
    thumbnailUrl: "",
    publishedAt: "",
  };
}

describe("home-feed-blend", () => {
  it("splits 24 items into 16 history and 8 generic budgets", () => {
    expect(homeFeedHistoryBudget(24)).toBe(16);
    expect(homeFeedGenericBudget(24)).toBe(8);
  });

  it("interleaves roughly 65% history", () => {
    const history = Array.from({ length: 16 }, (_, i) => v(`h${i}`));
    const generic = Array.from({ length: 8 }, (_, i) => v(`g${i}`));
    const merged = interleaveHistoryAndGeneric(history, generic);
    expect(merged).toHaveLength(24);
    const histCount = merged.filter((x) => x.id.startsWith("h")).length;
    expect(histCount).toBe(16);
  });
});
