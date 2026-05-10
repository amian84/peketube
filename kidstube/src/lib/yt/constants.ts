/**
 * OQ-01-001 C: categorías configurables en cliente; el servidor solo acepta
 * subconjuntos de esta lista fija (menú ampliable en prompts posteriores).
 */
export const PARENT_CATEGORY_OPTIONS = [
  15, 1, 24, 10, 22, 26, 27, 28,
] as const;

export type ParentCategoryId = (typeof PARENT_CATEGORY_OPTIONS)[number];

/** OQ-01-001 — default A */
export const DEFAULT_CATEGORY_IDS: readonly number[] = [15, 1, 24, 10];

/** OQ-01-004 C — valores por defecto hasta panel parental (ms) */
export const DEFAULT_FEED_TTL_MS = 30 * 60 * 1000;
export const DEFAULT_VIDEO_TTL_MS = 24 * 60 * 60 * 1000;

/** OQ-01-006 C — default ES + es */
export const DEFAULT_REGION_CODE = "ES";
export const DEFAULT_RELEVANCE_LANGUAGE = "es";

export const PARENT_CATEGORY_SET = new Set<number>(
  PARENT_CATEGORY_OPTIONS as unknown as number[],
);
