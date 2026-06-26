import { describe, expect, it } from "vitest";
import { themeBootstrapScript } from "@/lib/theme/theme-cache";

describe("themeBootstrapScript", () => {
  it("genera JavaScript válido (sin SyntaxError)", () => {
    const script = themeBootstrapScript();
    expect(() => {
      // eslint-disable-next-line no-new-func -- comprobar sintaxis del inline script
      new Function(script);
    }).not.toThrow();
  });
});
