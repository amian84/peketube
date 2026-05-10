import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  clearPinAttempts,
  isPinCooldownActive,
  recordPinFailure,
  remainingCooldownMs,
} from "@/lib/parental/attempts";
import { PARENTAL_COOLDOWN_MS } from "@/lib/parental/constants";

describe("pin attempts", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    clearPinAttempts();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    } as Storage);
  });

  it("tras 3 fallos entra cooldown 5 min", () => {
    const t0 = 1_000_000;
    recordPinFailure(t0);
    recordPinFailure(t0);
    expect(isPinCooldownActive(t0)).toBe(false);
    recordPinFailure(t0);
    expect(isPinCooldownActive(t0)).toBe(true);
    expect(remainingCooldownMs(t0)).toBe(PARENTAL_COOLDOWN_MS);
    expect(isPinCooldownActive(t0 + PARENTAL_COOLDOWN_MS)).toBe(false);
  });
});
