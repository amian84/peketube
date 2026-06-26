import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAYER_SEEK_STEP_SEC,
  MAX_PLAYER_SEEK_STEP_SEC,
  MIN_PLAYER_SEEK_STEP_SEC,
  clampPlayerSeekStepSec,
} from "./seek-step";

describe("clampPlayerSeekStepSec", () => {
  it("defaults invalid input to 10", () => {
    expect(clampPlayerSeekStepSec(Number.NaN)).toBe(
      DEFAULT_PLAYER_SEEK_STEP_SEC,
    );
  });

  it("clamps to 2–60", () => {
    expect(clampPlayerSeekStepSec(1)).toBe(MIN_PLAYER_SEEK_STEP_SEC);
    expect(clampPlayerSeekStepSec(2)).toBe(2);
    expect(clampPlayerSeekStepSec(60)).toBe(MAX_PLAYER_SEEK_STEP_SEC);
    expect(clampPlayerSeekStepSec(99)).toBe(MAX_PLAYER_SEEK_STEP_SEC);
  });
});
