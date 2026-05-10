import {
  DEFAULT_CATEGORY_IDS,
  DEFAULT_REGION_CODE,
  DEFAULT_RELEVANCE_LANGUAGE,
  PARENT_CATEGORY_SET,
} from "./constants";

const REGION_RE = /^[A-Z]{2}$/;
const LANG_RE = /^[a-z]{2}(-[A-Z]{2})?$/;

export function parseStrictKids(searchParams: URLSearchParams): boolean {
  return searchParams.get("strictKids") === "1";
}

/** OQ-01-006 C: query opcional; default ES + es */
export function parseRegionCode(searchParams: URLSearchParams): string {
  const raw = (searchParams.get("regionCode") ?? "").toUpperCase();
  if (raw && REGION_RE.test(raw)) return raw;
  return DEFAULT_REGION_CODE;
}

export function parseRelevanceLanguage(searchParams: URLSearchParams): string {
  const raw = searchParams.get("relevanceLanguage") ?? "";
  if (raw && LANG_RE.test(raw)) return raw;
  return DEFAULT_RELEVANCE_LANGUAGE;
}

/**
 * Lista de category IDs enviada por el cliente (OQ-01-001 C).
 * Solo se conservan IDs ∈ PARENT_CATEGORY_OPTIONS.
 * Si queda vacío → DEFAULT_CATEGORY_IDS.
 */
export function parseAllowedCategoryIds(searchParams: URLSearchParams): number[] {
  const raw = searchParams.get("categoryIds");
  if (!raw) return [...DEFAULT_CATEGORY_IDS];
  const nums = raw
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && PARENT_CATEGORY_SET.has(n));
  return nums.length ? nums : [...DEFAULT_CATEGORY_IDS];
}

export function parseSingleCategoryId(
  searchParams: URLSearchParams,
  key = "videoCategoryId",
): number | null {
  const v = searchParams.get(key);
  if (v === null || v === "") return null;
  const n = parseInt(v, 10);
  if (Number.isNaN(n) || !PARENT_CATEGORY_SET.has(n)) return null;
  return n;
}
