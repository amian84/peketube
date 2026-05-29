import { describe, expect, it } from "vitest";
import { getFeedEmptyHint } from "./feed-empty-hint";

describe("getFeedEmptyHint", () => {
  it("explains strict kids filter for a category", () => {
    const msg = getFeedEmptyHint({
      categoryLabel: "Todo",
      strictKidsOnly: true,
    });
    expect(msg).toContain("Todo");
    expect(msg).toContain("infantil");
  });

  it("prioritizes quota message", () => {
    const msg = getFeedEmptyHint({
      categoryLabel: "Música",
      strictKidsOnly: false,
      quotaExceeded: true,
    });
    expect(msg).toContain("Cuota");
  });
});
