/** Utilidad mínima para tests (TTL / frescura). */
export function isFresh(expiresAt: number, now = Date.now()): boolean {
  return expiresAt > now;
}
