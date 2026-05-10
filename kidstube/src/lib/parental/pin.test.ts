/** @vitest-environment happy-dom */

import { describe, expect, it, vi } from "vitest";
import { isValidPinFormat } from "@/lib/parental/pin-format";
import { generateRecoveryPhrase } from "@/lib/parental/pin";

describe("pin format", () => {
  it("acepta 4 dígitos", () => {
    expect(isValidPinFormat("1234")).toBe(true);
  });
  it("rechaza menos o más dígitos", () => {
    expect(isValidPinFormat("123")).toBe(false);
    expect(isValidPinFormat("12345")).toBe(false);
    expect(isValidPinFormat("12a4")).toBe(false);
  });
});

describe("generateRecoveryPhrase", () => {
  it("devuelve 6 palabras", () => {
    const spy = vi.spyOn(crypto, "getRandomValues").mockImplementation((arr) => {
      if (!arr) return arr;
      const a = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
      for (let i = 0; i < a.length; i++) a[i] = (i * 7 + 3) % 256;
      return arr;
    });
    const phrase = generateRecoveryPhrase();
    expect(phrase.split(" ").length).toBe(6);
    spy.mockRestore();
  });
});
