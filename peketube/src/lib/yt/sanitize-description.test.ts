import { describe, expect, it } from "vitest";
import { sanitizeVideoDescription } from "./sanitize-description";

describe("sanitizeVideoDescription", () => {
  it("strips HTML tags", () => {
    expect(sanitizeVideoDescription("<b>Hola</b> mundo")).toBe("Hola mundo");
  });

  it("keeps URLs as plain text", () => {
    const raw = "Ver https://youtube.com/watch?v=abc";
    expect(sanitizeVideoDescription(raw)).toBe(raw);
  });
});
