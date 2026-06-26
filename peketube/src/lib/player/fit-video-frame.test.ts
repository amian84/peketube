import { describe, expect, it } from "vitest";
import { fitVideoFrame16x9 } from "@/lib/player/fit-video-frame";

describe("fitVideoFrame16x9", () => {
  it("pillarbox on ultrawide 21:9", () => {
    const { width, height } = fitVideoFrame16x9(2560, 1080);
    expect(height).toBe(1080);
    expect(width).toBeCloseTo(1080 * (16 / 9), 0);
    expect(width).toBeLessThan(2560);
  });

  it("letterbox on tall viewport", () => {
    const { width, height } = fitVideoFrame16x9(390, 844);
    expect(width).toBe(390);
    expect(height).toBeCloseTo(390 / (16 / 9), 0);
    expect(height).toBeLessThan(844);
  });

  it("fills exact 16:9 screen", () => {
    const { width, height } = fitVideoFrame16x9(1920, 1080);
    expect(width).toBe(1920);
    expect(height).toBe(1080);
  });
});
