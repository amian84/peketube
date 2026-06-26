import { describe, expect, it } from "vitest";
import { isAutoDarkHour, resolveTheme } from "@/lib/theme/resolve-theme";

describe("resolveTheme", () => {
  it("respects fixed light and dark", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("auto uses dark at night and light by day", () => {
    expect(resolveTheme("auto", new Date(2026, 0, 1, 10, 0))).toBe("light");
    expect(resolveTheme("auto", new Date(2026, 0, 1, 21, 0))).toBe("dark");
    expect(resolveTheme("auto", new Date(2026, 0, 1, 6, 30))).toBe("dark");
    expect(resolveTheme("auto", new Date(2026, 0, 1, 7, 0))).toBe("light");
  });

  it("isAutoDarkHour boundaries", () => {
    expect(isAutoDarkHour(19)).toBe(false);
    expect(isAutoDarkHour(20)).toBe(true);
    expect(isAutoDarkHour(6)).toBe(true);
    expect(isAutoDarkHour(7)).toBe(false);
  });
});
