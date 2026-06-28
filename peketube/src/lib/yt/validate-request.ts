import {
  DEFAULT_CATEGORY_IDS,
  DEFAULT_REGION_CODE,
  DEFAULT_RELEVANCE_LANGUAGE,
  DEFAULT_SAFE_SEARCH,
  PARENT_CATEGORY_SET,
  SAFE_SEARCH_SET,
  type SafeSearchMode,
} from "./constants";

const REGION_RE = /^[A-Z]{2}$/;
const LANG_RE = /^[a-z]{2}(-[A-Z]{2})?$/;

export function parseStrictKids(searchParams: URLSearchParams): boolean {
  return searchParams.get("strictKids") === "1";
}

/**
 * Modo SafeSearch para `youtube.search.list`. Si la query no envía nada o el
 * valor es inválido, devolvemos `DEFAULT_SAFE_SEARCH` (`strict`) para no
 * relajar el filtro por accidente.
 */
export function parseSafeSearch(searchParams: URLSearchParams): SafeSearchMode {
  const raw = searchParams.get("safeSearch");
  if (raw && SAFE_SEARCH_SET.has(raw)) return raw as SafeSearchMode;
  return DEFAULT_SAFE_SEARCH;
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

/** YouTube `search.list` — `videoDuration` opcional (prompt 03 Shorts). */
export function parseVideoDuration(
  searchParams: URLSearchParams,
): "short" | "medium" | "long" | undefined {
  const v = searchParams.get("videoDuration");
  if (v === "short" || v === "medium" || v === "long") return v;
  return undefined;
}
