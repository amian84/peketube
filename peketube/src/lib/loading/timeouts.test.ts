import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAYER_READY_TIMEOUT_SEC,
  clampLoadTimeoutSec,
} from "./timeouts";

describe("clampLoadTimeoutSec", () => {
  it("clamps to 5–120", () => {
    expect(clampLoadTimeoutSec(3, DEFAULT_PLAYER_READY_TIMEOUT_SEC)).toBe(5);
    expect(clampLoadTimeoutSec(35, DEFAULT_PLAYER_READY_TIMEOUT_SEC)).toBe(35);
    expect(clampLoadTimeoutSec(200, DEFAULT_PLAYER_READY_TIMEOUT_SEC)).toBe(
      120,
    );
  });
});
