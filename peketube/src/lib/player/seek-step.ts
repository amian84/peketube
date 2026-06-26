export const MIN_PLAYER_SEEK_STEP_SEC = 2;
export const MAX_PLAYER_SEEK_STEP_SEC = 60;
export const DEFAULT_PLAYER_SEEK_STEP_SEC = 10;

export function clampPlayerSeekStepSec(value: number): number {
  const n = Math.floor(value);
  if (!Number.isFinite(n)) return DEFAULT_PLAYER_SEEK_STEP_SEC;
  return Math.min(MAX_PLAYER_SEEK_STEP_SEC, Math.max(MIN_PLAYER_SEEK_STEP_SEC, n));
}
