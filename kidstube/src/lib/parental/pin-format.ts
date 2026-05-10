/** Validación PIN / frase — sin I/O (cliente y servidor). */

export function isValidPinFormat(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export function normalizeRecoveryPhrase(phrase: string): string {
  return phrase.trim().toLowerCase().replace(/\s+/g, " ");
}
