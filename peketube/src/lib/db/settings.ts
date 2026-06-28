import {
  DEFAULT_CATEGORY_IDS,
  DEFAULT_FEED_TTL_MS,
  DEFAULT_REGION_CODE,
  DEFAULT_RELEVANCE_LANGUAGE,
  DEFAULT_SAFE_SEARCH,
  DEFAULT_VIDEO_TTL_MS,
  SAFE_SEARCH_SET,
  type SafeSearchMode,
} from "@/lib/yt/constants";
import {
  DEFAULT_PARENTAL_SESSION_TTL_MS,
  MAX_PARENTAL_SESSION_TTL_MS,
  MIN_PARENTAL_SESSION_TTL_MS,
} from "@/lib/parental/constants";
import type { ThemeMode } from "@/lib/theme/resolve-theme";
import {
  DEFAULT_PLAYER_SEEK_STEP_SEC,
  clampPlayerSeekStepSec,
} from "@/lib/player/seek-step";
import {
  DEFAULT_FEED_BOOTSTRAP_TIMEOUT_SEC,
  DEFAULT_FEED_LOAD_TIMEOUT_SEC,
  DEFAULT_PLAYER_READY_TIMEOUT_SEC,
  DEFAULT_WATCH_META_TIMEOUT_SEC,
  clampLoadTimeoutSec,
} from "@/lib/loading/timeouts";
import { getPeketubeDb } from "./schema";

const SETTINGS_ROW_KEY = "app";

/** OQ-05-001 — cuándo crear la fila de historial (panel parental 07). */
export type HistoryRecordMode = "on_play" | "after_10s" | "on_end";

export interface PeketubeSettings {
  /** OQ-01-001 C */
  allowedCategoryIds: number[];
  /** OQ-01-002 B — default ON */
  strictKidsOnly: boolean;
  /**
   * Modo SafeSearch que se envía a YouTube `search.list` (búsqueda y vídeos
   * relacionados por título). Default `strict`.
   */
  safeSearch: SafeSearchMode;
  /** OQ-01-004 C */
  feedTtlMs: number;
  videoTtlMs: number;
  /** OQ-01-006 C — default ES + es */
  regionCode: string;
  relevanceLanguage: string;
  /** OQ-04-001 — autoplay del siguiente en /watch (panel parental prompt 07). */
  autoPlayNext: boolean;
  /** Segundos al doble toque/clic en los lados del reproductor (2–60). */
  playerSeekStepSec: number;
  /** Segundos máx. esperando sesión/listas antes del feed (5–120). */
  feedBootstrapTimeoutSec: number;
  /** Segundos máx. de la petición inicial del feed (5–120). */
  feedLoadTimeoutSec: number;
  /** Segundos máx. cargando metadatos del vídeo en /watch (5–120). */
  watchMetaTimeoutSec: number;
  /** Segundos máx. hasta que el reproductor YouTube esté listo (5–120). */
  playerReadyTimeoutSec: number;
  /** OQ-04-003 — mostrar comentarios en /watch (panel parental prompt 07). */
  showVideoComments: boolean;
  /** OQ-05-001 — default primer PLAYING. */
  historyRecordMode: HistoryRecordMode;
  /** OQ-05-002 — días de retención (1–365), default 30. */
  historyRetentionDays: number;
  /** OQ-07-003 — TTL sesión parental (ms), default 1 min. */
  parentalSessionTtlMs: number;
  /**
   * Máx. vídeos en home y en resultados de búsqueda antes de dejar de pedir a la
   * API; al seguir bajando se vuelve al inicio de la lista (24–300).
   */
  scrollLoopMaxItems: number;
  /** Claro / oscuro / automático según hora local (20:00–07:00 oscuro). */
  themeMode: ThemeMode;
}

export const DEFAULT_PEKETUBE_SETTINGS: PeketubeSettings = {
  allowedCategoryIds: [...DEFAULT_CATEGORY_IDS],
  strictKidsOnly: true,
  safeSearch: DEFAULT_SAFE_SEARCH,
  feedTtlMs: DEFAULT_FEED_TTL_MS,
  videoTtlMs: DEFAULT_VIDEO_TTL_MS,
  regionCode: DEFAULT_REGION_CODE,
  relevanceLanguage: DEFAULT_RELEVANCE_LANGUAGE,
  autoPlayNext: false,
  playerSeekStepSec: DEFAULT_PLAYER_SEEK_STEP_SEC,
  feedBootstrapTimeoutSec: DEFAULT_FEED_BOOTSTRAP_TIMEOUT_SEC,
  feedLoadTimeoutSec: DEFAULT_FEED_LOAD_TIMEOUT_SEC,
  watchMetaTimeoutSec: DEFAULT_WATCH_META_TIMEOUT_SEC,
  playerReadyTimeoutSec: DEFAULT_PLAYER_READY_TIMEOUT_SEC,
  showVideoComments: false,
  historyRecordMode: "on_play",
  historyRetentionDays: 30,
  parentalSessionTtlMs: DEFAULT_PARENTAL_SESSION_TTL_MS,
  scrollLoopMaxItems: 80,
  themeMode: "auto",
};

function mergeSettings(raw: unknown): PeketubeSettings {
  const base = { ...DEFAULT_PEKETUBE_SETTINGS };
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
  if (typeof o.safeSearch === "string" && SAFE_SEARCH_SET.has(o.safeSearch)) {
    base.safeSearch = o.safeSearch as SafeSearchMode;
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
  if (typeof o.playerSeekStepSec === "number") {
    base.playerSeekStepSec = clampPlayerSeekStepSec(o.playerSeekStepSec);
  }
  if (typeof o.feedBootstrapTimeoutSec === "number") {
    base.feedBootstrapTimeoutSec = clampLoadTimeoutSec(
      o.feedBootstrapTimeoutSec,
      DEFAULT_FEED_BOOTSTRAP_TIMEOUT_SEC,
    );
  }
  if (typeof o.feedLoadTimeoutSec === "number") {
    base.feedLoadTimeoutSec = clampLoadTimeoutSec(
      o.feedLoadTimeoutSec,
      DEFAULT_FEED_LOAD_TIMEOUT_SEC,
    );
  }
  if (typeof o.watchMetaTimeoutSec === "number") {
    base.watchMetaTimeoutSec = clampLoadTimeoutSec(
      o.watchMetaTimeoutSec,
      DEFAULT_WATCH_META_TIMEOUT_SEC,
    );
  }
  if (typeof o.playerReadyTimeoutSec === "number") {
    base.playerReadyTimeoutSec = clampLoadTimeoutSec(
      o.playerReadyTimeoutSec,
      DEFAULT_PLAYER_READY_TIMEOUT_SEC,
    );
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
  if (typeof o.parentalSessionTtlMs === "number") {
    const t = Math.floor(o.parentalSessionTtlMs);
    if (t >= MIN_PARENTAL_SESSION_TTL_MS && t <= MAX_PARENTAL_SESSION_TTL_MS) {
      base.parentalSessionTtlMs = t;
    }
  }
  if (typeof o.scrollLoopMaxItems === "number") {
    const n = Math.floor(o.scrollLoopMaxItems);
    if (n >= 24 && n <= 300) base.scrollLoopMaxItems = n;
  }
  if (
    o.themeMode === "auto" ||
    o.themeMode === "light" ||
    o.themeMode === "dark"
  ) {
    base.themeMode = o.themeMode;
  }
  return base;
}

export async function getSettingsFromDexie(): Promise<PeketubeSettings> {
  const dex = getPeketubeDb();
  if (!dex) return { ...DEFAULT_PEKETUBE_SETTINGS };
  const row = await dex.settings.get(SETTINGS_ROW_KEY);
  return mergeSettings(row?.value);
}

export async function saveSettingsToDexie(
  partial: Partial<PeketubeSettings>,
): Promise<PeketubeSettings> {
  const dex = getPeketubeDb();
  const current = await getSettingsFromDexie();
  const next = { ...current, ...partial };
  if (dex) {
    await dex.settings.put({ key: SETTINGS_ROW_KEY, value: next });
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("peketube-settings-changed"));
  }
  return next;
}

/**
 * Borra caché API, historial local, listas de bloqueo en Dexie y demás claves de
 * `settings` excepto la fila de ajustes de la app (`app`). Tras reset parental.
 */
export async function wipeLocalPeketubeStoresKeepAppSettings(
  settings: PeketubeSettings,
): Promise<void> {
  const dex = getPeketubeDb();
  if (!dex) return;
  await dex.transaction(
    "rw",
    [
      dex.apiCache,
      dex.watchHistory,
      dex.blockedChannels,
      dex.blockedVideos,
      dex.blockedTitleKeywords,
      dex.settings,
    ],
    async () => {
      await dex.apiCache.clear();
      await dex.watchHistory.clear();
      await dex.blockedChannels.clear();
      await dex.blockedVideos.clear();
      await dex.blockedTitleKeywords.clear();
      await dex.settings.clear();
      await dex.settings.put({ key: SETTINGS_ROW_KEY, value: settings });
    },
  );
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("peketube-settings-changed"));
  }
}
