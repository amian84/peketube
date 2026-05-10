import {
  DEFAULT_CATEGORY_IDS,
  DEFAULT_FEED_TTL_MS,
  DEFAULT_REGION_CODE,
  DEFAULT_RELEVANCE_LANGUAGE,
  DEFAULT_VIDEO_TTL_MS,
} from "@/lib/yt/constants";
import { getKidstubeDb } from "./schema";

const SETTINGS_ROW_KEY = "app";

export interface KidstubeSettings {
  /** OQ-01-001 C */
  allowedCategoryIds: number[];
  /** OQ-01-002 B — default ON */
  strictKidsOnly: boolean;
  /** OQ-01-004 C */
  feedTtlMs: number;
  videoTtlMs: number;
  /** OQ-01-006 C — default ES + es */
  regionCode: string;
  relevanceLanguage: string;
}

export const DEFAULT_KIDSTUBE_SETTINGS: KidstubeSettings = {
  allowedCategoryIds: [...DEFAULT_CATEGORY_IDS],
  strictKidsOnly: true,
  feedTtlMs: DEFAULT_FEED_TTL_MS,
  videoTtlMs: DEFAULT_VIDEO_TTL_MS,
  regionCode: DEFAULT_REGION_CODE,
  relevanceLanguage: DEFAULT_RELEVANCE_LANGUAGE,
};

function mergeSettings(raw: unknown): KidstubeSettings {
  const base = { ...DEFAULT_KIDSTUBE_SETTINGS };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  if (Array.isArray(o.allowedCategoryIds)) {
    base.allowedCategoryIds = o.allowedCategoryIds.filter(
      (n): n is number => typeof n === "number" && Number.isFinite(n),
    );
    if (base.allowedCategoryIds.length === 0) {
      base.allowedCategoryIds = [...DEFAULT_CATEGORY_IDS];
    }
  }
  if (typeof o.strictKidsOnly === "boolean") {
    base.strictKidsOnly = o.strictKidsOnly;
  }
  if (typeof o.feedTtlMs === "number" && o.feedTtlMs >= 60_000) {
    base.feedTtlMs = o.feedTtlMs;
  }
  if (typeof o.videoTtlMs === "number" && o.videoTtlMs >= 60_000) {
    base.videoTtlMs = o.videoTtlMs;
  }
  if (typeof o.regionCode === "string" && /^[A-Z]{2}$/.test(o.regionCode)) {
    base.regionCode = o.regionCode;
  }
  if (
    typeof o.relevanceLanguage === "string" &&
    /^[a-z]{2}(-[A-Z]{2})?$/.test(o.relevanceLanguage)
  ) {
    base.relevanceLanguage = o.relevanceLanguage;
  }
  return base;
}

export async function getSettingsFromDexie(): Promise<KidstubeSettings> {
  const dex = getKidstubeDb();
  if (!dex) return { ...DEFAULT_KIDSTUBE_SETTINGS };
  const row = await dex.settings.get(SETTINGS_ROW_KEY);
  return mergeSettings(row?.value);
}

export async function saveSettingsToDexie(
  partial: Partial<KidstubeSettings>,
): Promise<KidstubeSettings> {
  const dex = getKidstubeDb();
  const current = await getSettingsFromDexie();
  const next = { ...current, ...partial };
  if (dex) {
    await dex.settings.put({ key: SETTINGS_ROW_KEY, value: next });
  }
  return next;
}
