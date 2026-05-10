import {
  DEFAULT_CATEGORY_IDS,
  DEFAULT_FEED_TTL_MS,
  DEFAULT_REGION_CODE,
  DEFAULT_RELEVANCE_LANGUAGE,
  DEFAULT_VIDEO_TTL_MS,
} from "@/lib/yt/constants";
import { getKidstubeDb } from "./schema";

const SETTINGS_ROW_KEY = "app";

/** OQ-05-001 — cuándo crear la fila de historial (panel parental 07). */
export type HistoryRecordMode = "on_play" | "after_10s" | "on_end";

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
  /** OQ-04-001 — autoplay del siguiente en /watch (panel parental prompt 07). */
  autoPlayNext: boolean;
  /** OQ-04-003 — mostrar comentarios en /watch (panel parental prompt 07). */
  showVideoComments: boolean;
  /** OQ-05-001 — default primer PLAYING. */
  historyRecordMode: HistoryRecordMode;
  /** OQ-05-002 — días de retención (1–365), default 30. */
  historyRetentionDays: number;
}

export const DEFAULT_KIDSTUBE_SETTINGS: KidstubeSettings = {
  allowedCategoryIds: [...DEFAULT_CATEGORY_IDS],
  strictKidsOnly: true,
  feedTtlMs: DEFAULT_FEED_TTL_MS,
  videoTtlMs: DEFAULT_VIDEO_TTL_MS,
  regionCode: DEFAULT_REGION_CODE,
  relevanceLanguage: DEFAULT_RELEVANCE_LANGUAGE,
  autoPlayNext: true,
  showVideoComments: false,
  historyRecordMode: "on_play",
  historyRetentionDays: 30,
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
  if (typeof o.autoPlayNext === "boolean") {
    base.autoPlayNext = o.autoPlayNext;
  }
  if (typeof o.showVideoComments === "boolean") {
    base.showVideoComments = o.showVideoComments;
  }
  if (
    o.historyRecordMode === "on_play" ||
    o.historyRecordMode === "after_10s" ||
    o.historyRecordMode === "on_end"
  ) {
    base.historyRecordMode = o.historyRecordMode;
  }
  if (typeof o.historyRetentionDays === "number") {
    const d = Math.floor(o.historyRetentionDays);
    if (d >= 1 && d <= 365) base.historyRetentionDays = d;
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
