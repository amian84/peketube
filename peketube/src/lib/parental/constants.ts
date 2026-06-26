/** OQ-07-006 */
export const PARENTAL_MAX_PIN_ATTEMPTS = 3;
export const PARENTAL_COOLDOWN_MS = 5 * 60 * 1000;

/** OQ-07-003 — default 1 min */
export const DEFAULT_PARENTAL_SESSION_TTL_MS = 60 * 1000;
export const MIN_PARENTAL_SESSION_TTL_MS = 60 * 1000;
export const MAX_PARENTAL_SESSION_TTL_MS = 60 * 60 * 1000;

export const PBKDF2_ITERATIONS = 250_000;
export const PIN_DERIVED_KEY_BYTES = 32;
export const PIN_SALT_BYTES = 16;
