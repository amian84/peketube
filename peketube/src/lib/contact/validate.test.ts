import { describe, expect, it } from "vitest";
import { validateContactPayload } from "./validate";

describe("validateContactPayload", () => {
  it("accepts valid payload", () => {
    const r = validateContactPayload({
      fromEmail: "user@example.com",
      subject: "Hola",
      message: "Gracias por PekeTube",
    });
    expect(r.ok).toBe(true);
  });

  it("rejects honeypot", () => {
    const r = validateContactPayload({
      fromEmail: "user@example.com",
      subject: "Spam",
      message: "x",
      website: "http://spam.test",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects invalid email", () => {
    const r = validateContactPayload({
      fromEmail: "not-an-email",
      subject: "Hi",
      message: "Test",
    });
    expect(r.ok).toBe(false);
  });
});
