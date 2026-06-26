import { describe, expect, it, vi } from "vitest";
import {
  FeedLoadTimeoutError,
  withFeedLoadTimeout,
} from "./feed-loading";

describe("withFeedLoadTimeout", () => {
  it("resolves when the promise finishes in time", async () => {
    await expect(withFeedLoadTimeout(Promise.resolve(42), 50)).resolves.toBe(42);
  });

  it("rejects with FeedLoadTimeoutError when too slow", async () => {
    vi.useFakeTimers();
    const slow = new Promise<number>((resolve) => {
      setTimeout(() => resolve(1), 100);
    });
    const pending = withFeedLoadTimeout(slow, 30);
    vi.advanceTimersByTime(31);
    await expect(pending).rejects.toBeInstanceOf(FeedLoadTimeoutError);
    vi.useRealTimers();
  });
});
