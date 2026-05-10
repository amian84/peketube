/** @vitest-environment node */

import { describe, expect, it } from "vitest";
import { derivePinHashB64, verifyPinRecord } from "@/lib/parental/pin-pbkdf2-node";

describe("pin-node pbkdf2", () => {
  it("verifica PIN con salt fijo (iter baja solo en test)", () => {
    const iter = 12;
    const salt = Buffer.from("0123456789abcdef", "ascii");
    const h = derivePinHashB64("4242", salt, iter);
    expect(verifyPinRecord("4242", salt.toString("base64"), h, iter)).toBe(true);
    expect(verifyPinRecord("4243", salt.toString("base64"), h, iter)).toBe(false);
  });
});
