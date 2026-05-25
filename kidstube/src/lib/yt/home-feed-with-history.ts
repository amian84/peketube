import { listHistory } from "@/lib/db/history";
import { applyBlacklist, type BlacklistSnapshot } from "@/lib/yt/filter";
import {
  aggregateFilteredVideos,
  DEFAULT_VIDEO_GRID_DESIRED,
  SCROLL_AGGREGATE_BATCH,
} from "@/lib/yt/fill-filtered-page";
import { fetchFeedPage, fetchRelatedVideos, fetchSearchPage } from "@/lib/yt/client";
import type { VideoDTO } from "@/lib/yt/types";

/** Semillas distintas en la carga inicial (historial → similares). */
const MAX_HISTORY_SEEDS_INITIAL = 5;
/** Semillas distintas al rotar en scroll (más episodios / canales del historial). */
const MAX_HISTORY_SEEDS_SCROLL = 12;
/** Vídeos extra por scroll desde una semilla del historial. */
const SCROLL_HISTORY_RELATED_MAX = 6;
/** Con el feed popular ya lleno (24), hasta N vídeos extra “además” por historial (carga inicial). */
const MAX_EXTRA_SIMILAR_WHEN_FULL = 8;

function uniqueHistorySeeds(
  rows: Awaited<ReturnType<typeof listHistory>>,
  maxSeeds: number,
): { videoId: string; title: string; channelId: string }[] {
  const seen = new Set<string>();
  const out: { videoId: string; title: string; channelId: string }[] = [];
  for (const r of rows) {
    if (!r.videoId || !r.channelId) continue;
    if (seen.has(r.videoId)) continue;
    seen.add(r.videoId);
    out.push({
      videoId: r.videoId,
      title: r.title ?? "",
      channelId: r.channelId,
    });
    if (out.length >= maxSeeds) break;
  }
  return out;
}

export type HomeFeedInitialPayload = {
  feedItems: VideoDTO[];
  historyTail: VideoDTO[];
  feedNextPageToken?: string;
  stale: boolean;
  quotaExceeded: boolean;
  extraFromHistory: number;
  /** Hay filas en Dexie (aunque no entren semillas únicas). */
  hasHistoryRows: boolean;
};

/**
 * Feed popular por categoría +, si hay historial local, peticiones a “similares”
 * (misma ruta que el reproductor: búsqueda por título + uploads del canal).
 */
export async function loadHomeFeedWithHistorySimilar(
  categoryId: number,
  snapshot: BlacklistSnapshot,
): Promise<HomeFeedInitialPayload> {
  let stale = false;
  let quotaExceeded = false;
  let base: VideoDTO[] = [];
  let feedNextPageToken: string | undefined;
  try {
    const aggregated = await aggregateFilteredVideos(
      (token) => fetchFeedPage(categoryId, token),
      snapshot,
      DEFAULT_VIDEO_GRID_DESIRED,
    );
    stale = !!aggregated.stale;
    quotaExceeded = !!aggregated.quotaExceeded;
    base = aggregated.items;
    feedNextPageToken = aggregated.nextPageToken;
  } catch {
    /* sin ranking (p. ej. sesión); se rellena con historial */
  }

  const historyRows = await listHistory({ limit: 40 });
  const hasHistoryRows = historyRows.length > 0;
  const seeds = uniqueHistorySeeds(historyRows, MAX_HISTORY_SEEDS_INITIAL);
  if (seeds.length === 0) {
    return {
      feedItems: base,
      historyTail: [],
      feedNextPageToken,
      stale,
      quotaExceeded,
      extraFromHistory: 0,
      hasHistoryRows,
    };
  }

  const similarBudget =
    base.length >= DEFAULT_VIDEO_GRID_DESIRED
      ? MAX_EXTRA_SIMILAR_WHEN_FULL
      : DEFAULT_VIDEO_GRID_DESIRED - base.length;

  const seen = new Set<string>(base.map((v) => v.id));
  for (const s of seeds) seen.add(s.videoId);

  const similar: VideoDTO[] = [];
  for (const seed of seeds) {
    if (similar.length >= similarBudget) break;
    try {
      const { data, stale: st, quotaExceeded: qe } = await fetchRelatedVideos(
        seed.videoId,
        seed.title,
        seed.channelId,
      );
      if (st) stale = true;
      if (qe) quotaExceeded = true;
      const filtered = applyBlacklist(data.items ?? [], snapshot);
      for (const v of filtered) {
        if (seen.has(v.id)) continue;
        seen.add(v.id);
        similar.push(v);
        if (similar.length >= similarBudget) break;
      }
    } catch {
      /* una semilla fallida no bloquea el resto */
    }
  }

  if (similar.length < similarBudget) {
    const searchFill = await appendSearchFromHistory(
      snapshot,
      seen,
      similarBudget - similar.length,
    );
    if (searchFill.stale) stale = true;
    if (searchFill.quotaExceeded) quotaExceeded = true;
    similar.push(...searchFill.items);
  }

  return {
    feedItems: base,
    historyTail: similar,
    feedNextPageToken,
    stale,
    quotaExceeded,
    extraFromHistory: similar.length,
    hasHistoryRows,
  };
}

/**
 * Una ronda de similares desde el historial (rotación por `seedRoundIndex`),
 * para mezclar con el scroll del ranking (p. ej. más Pocoyo si ya lo viste).
 */
export async function loadMoreHistoryRelatedChunk(
  snapshot: BlacklistSnapshot,
  excludeIds: Set<string>,
  seedRoundIndex: number,
  maxAdds: number = SCROLL_HISTORY_RELATED_MAX,
): Promise<{
  videos: VideoDTO[];
  stale: boolean;
  quotaExceeded: boolean;
  nextSeedIndex: number;
}> {
  const historyRows = await listHistory({ limit: 60 });
  const seeds = uniqueHistorySeeds(historyRows, MAX_HISTORY_SEEDS_SCROLL);
  if (seeds.length === 0) {
    return {
      videos: [],
      stale: false,
      quotaExceeded: false,
      nextSeedIndex: seedRoundIndex,
    };
  }

  const idx = ((seedRoundIndex % seeds.length) + seeds.length) % seeds.length;
  const seed = seeds[idx]!;
  let stale = false;
  let quotaExceeded = false;
  const out: VideoDTO[] = [];

  try {
    const { data, stale: st, quotaExceeded: qe } = await fetchRelatedVideos(
      seed.videoId,
      seed.title,
      seed.channelId,
    );
    if (st) stale = true;
    if (qe) quotaExceeded = true;
    const filtered = applyBlacklist(data.items ?? [], snapshot);
    for (const v of filtered) {
      if (excludeIds.has(v.id)) continue;
      excludeIds.add(v.id);
      out.push(v);
      if (out.length >= maxAdds) break;
    }
  } catch {
    /* ignorar */
  }

  return {
    videos: out,
    stale,
    quotaExceeded,
    nextSeedIndex: seedRoundIndex + 1,
  };
}

function normalizeSearchQuery(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 100);
}

function channelSearchLabel(channelTitle: string): string | null {
  const trimmed = channelTitle
    .replace(/\s*[-|·]\s*canal\s+oficial.*$/i, "")
    .replace(/\s*espa[nñ]ol.*$/i, "")
    .trim();
  if (trimmed.length < 3 || trimmed.length > 60) return null;
  return trimmed;
}

/** Consultas para `search.list` (canal corto primero, luego título del vídeo). */
export function buildHistorySearchQueries(
  rows: Awaited<ReturnType<typeof listHistory>>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (q: string) => {
    const n = normalizeSearchQuery(q);
    if (n.length < 3) return;
    const key = n.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(n);
  };
  for (const r of rows) {
    const ch = r.channelTitle ? channelSearchLabel(r.channelTitle) : null;
    if (ch) push(ch);
    if (r.title) push(r.title);
    if (out.length >= 12) break;
  }
  return out;
}

async function appendSearchFromHistory(
  snapshot: BlacklistSnapshot,
  seen: Set<string>,
  budget: number,
): Promise<{
  items: VideoDTO[];
  stale: boolean;
  quotaExceeded: boolean;
}> {
  const queries = buildHistorySearchQueries(await listHistory({ limit: 40 }));
  const items: VideoDTO[] = [];
  let stale = false;
  let quotaExceeded = false;
  for (const q of queries) {
    if (items.length >= budget) break;
    try {
      const agg = await loadSearchSupplementBatch(q, snapshot);
      if (agg.stale) stale = true;
      if (agg.quotaExceeded) quotaExceeded = true;
      for (const v of agg.items) {
        if (seen.has(v.id)) continue;
        seen.add(v.id);
        items.push(v);
        if (items.length >= budget) break;
      }
    } catch {
      /* siguiente consulta */
    }
  }
  return { items, stale, quotaExceeded };
}

/** Una tanda de resultados de búsqueda (relleno bajo el tope N del home). */
export async function loadSearchSupplementBatch(
  q: string,
  snapshot: BlacklistSnapshot,
  pageToken?: string,
) {
  return aggregateFilteredVideos(
    (t) => fetchSearchPage(q, t),
    snapshot,
    SCROLL_AGGREGATE_BATCH,
    pageToken ? { initialPageToken: pageToken } : undefined,
  );
}

/** Más vídeos del chart popular (scroll infinito). */
export async function loadMoreHomeFeedPopular(
  categoryId: number,
  snapshot: BlacklistSnapshot,
  pageToken: string,
): Promise<{
  feedItems: VideoDTO[];
  feedNextPageToken?: string;
  stale: boolean;
  quotaExceeded: boolean;
}> {
  const aggregated = await aggregateFilteredVideos(
    (token) => fetchFeedPage(categoryId, token),
    snapshot,
    SCROLL_AGGREGATE_BATCH,
    { initialPageToken: pageToken },
  );
  return {
    feedItems: aggregated.items,
    feedNextPageToken: aggregated.nextPageToken,
    stale: !!aggregated.stale,
    quotaExceeded: !!aggregated.quotaExceeded,
  };
}
