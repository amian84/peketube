import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import {
  PIN_DERIVED_KEY_BYTES,
  PIN_SALT_BYTES,
} from "@/lib/parental/constants";

export function randomPinSalt(): Buffer {
  return randomBytes(PIN_SALT_BYTES);
}

export function derivePinHashB64(
  pin: string,
  salt: Buffer,
  iterations: number,
): string {
  const hash = pbkdf2Sync(
    pin,
    salt,
    iterations,
    PIN_DERIVED_KEY_BYTES,
    "sha256",
  );
  return hash.toString("base64");
}

export function verifyPinRecord(
  pin: string,
  saltB64: string,
  hashB64: string,
  iter: number,
): boolean {
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const got = pbkdf2Sync(pin, salt, iter, PIN_DERIVED_KEY_BYTES, "sha256");
  if (got.length !== expected.length) return false;
  return timingSafeEqual(got, expected);
}
