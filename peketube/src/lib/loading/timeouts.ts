export const MIN_LOAD_TIMEOUT_SEC = 5;
export const MAX_LOAD_TIMEOUT_SEC = 120;

export const DEFAULT_FEED_BOOTSTRAP_TIMEOUT_SEC = 12;
export const DEFAULT_FEED_LOAD_TIMEOUT_SEC = 25;
export const DEFAULT_WATCH_META_TIMEOUT_SEC = 25;
export const DEFAULT_PLAYER_READY_TIMEOUT_SEC = 35;

export const HOME_FEED_SKELETON_COUNT = 8;

export const LOAD_TIMEOUT_MESSAGE =
  "Tardó demasiado en cargar. Comprueba la conexión e inténtalo de nuevo.";

export function clampLoadTimeoutSec(value: number, fallback: number): number {
  const n = Math.floor(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_LOAD_TIMEOUT_SEC, Math.max(MIN_LOAD_TIMEOUT_SEC, n));
}

export function secToMs(sec: number): number {
  return sec * 1000;
}
