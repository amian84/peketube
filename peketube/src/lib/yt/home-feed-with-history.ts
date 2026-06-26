import { listHistory, listHistoryAsVideos } from "@/lib/db/history";
import { applyBlacklist, type BlacklistSnapshot } from "@/lib/yt/filter";
import {
  aggregateFilteredVideos,
  DEFAULT_VIDEO_GRID_DESIRED,
  SCROLL_AGGREGATE_BATCH,
} from "@/lib/yt/fill-filtered-page";
import type { HomeFeedChipId } from "@/lib/yt/home-chips";
import {
  homeFeedGenericBudget,
  homeFeedHistoryBudget,
  interleaveHistoryAndGeneric,
  splitBlendedFeed,
} from "@/lib/yt/home-feed-blend";
import {
  aggregateHomeChipSearch,
  loadMoreHomeFeedSearch,
  type HomeFeedSearchCursor,
} from "@/lib/yt/home-feed-search";
import { fetchRelatedVideos, fetchSearchPage } from "@/lib/yt/client";
import type { VideoDTO } from "@/lib/yt/types";

/** Semillas distintas en la carga inicial (historial → similares). */
const MAX_HISTORY_SEEDS_INITIAL = 5;
/** Semillas distintas al rotar en scroll (más episodios / canales del historial). */
const MAX_HISTORY_SEEDS_SCROLL = 12;
/** Vídeos recientes del historial en la parte superior del feed. */
const MAX_HISTORY_BASE_ITEMS = 12;
/** Vídeos extra por scroll desde una semilla del historial. */
const SCROLL_HISTORY_RELATED_MAX = 6;
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
  feedSearchCursor: HomeFeedSearchCursor | null;
  stale: boolean;
  quotaExceeded: boolean;
  extraFromHistory: number;
  hasHistoryRows: boolean;
};

async function collectHistorySimilar(
  snapshot: BlacklistSnapshot,
  base: VideoDTO[],
  historyRows: Awaited<ReturnType<typeof listHistory>>,
  similarBudget: number,
): Promise<{
  similar: VideoDTO[];
  stale: boolean;
  quotaExceeded: boolean;
}> {
  if (similarBudget <= 0) {
    return { similar: [], stale: false, quotaExceeded: false };
  }

  let stale = false;
  let quotaExceeded = false;
  const seeds = uniqueHistorySeeds(historyRows, MAX_HISTORY_SEEDS_INITIAL);

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

  return { similar, stale, quotaExceeded };
}

/** Feed con historial: ~65% relacionado + ~35% búsqueda genérica del chip. */
async function loadHomeFeedFromHistory(
  chipId: HomeFeedChipId,
  regionCode: string,
  snapshot: BlacklistSnapshot,
  historyRows: Awaited<ReturnType<typeof listHistory>>,
): Promise<HomeFeedInitialPayload> {
  let stale = false;
  let quotaExceeded = false;

  const historyBudget = homeFeedHistoryBudget();
  const genericBudget = homeFeedGenericBudget();

  const base = await listHistoryAsVideos(
    snapshot,
    Math.min(MAX_HISTORY_BASE_ITEMS, historyBudget),
  );
  const similarBudget = Math.max(0, historyBudget - base.length);
  const { similar, stale: st1, quotaExceeded: qe1 } = await collectHistorySimilar(
    snapshot,
    base,
    historyRows,
    similarBudget,
  );
  if (st1) stale = true;
  if (qe1) quotaExceeded = true;

  const historyRelated: VideoDTO[] = [];
  const seen = new Set<string>();
  for (const v of [...base, ...similar]) {
    if (seen.has(v.id)) continue;
    seen.add(v.id);
    historyRelated.push(v);
    if (historyRelated.length >= historyBudget) break;
  }

  let genericItems: VideoDTO[] = [];
  let feedSearchCursor: HomeFeedSearchCursor | null = null;
  if (genericBudget > 0) {
    const searchBatch = await aggregateHomeChipSearch(
      chipId,
      regionCode,
      snapshot,
      genericBudget,
      undefined,
      seen,
    );
    genericItems = searchBatch.items;
    feedSearchCursor = searchBatch.nextCursor;
    if (searchBatch.stale) stale = true;
    if (searchBatch.quotaExceeded) quotaExceeded = true;
    for (const v of genericItems) seen.add(v.id);
  }

  const merged = interleaveHistoryAndGeneric(historyRelated, genericItems);
  const { popular, tail } = splitBlendedFeed(
    merged,
    Math.min(12, merged.length),
  );

  return {
    feedItems: popular,
    historyTail: tail,
    feedSearchCursor,
    stale,
    quotaExceeded,
    extraFromHistory: historyRelated.length,
    hasHistoryRows: true,
  };
}

/**
 * Sin historial: búsquedas regionales del chip (Todo / Música / Dibujos).
 * Con historial: ~65% historial/similares + ~35% descubrimiento genérico.
 */
export async function loadHomeFeedWithHistorySimilar(
  chipId: HomeFeedChipId,
  regionCode: string,
  snapshot: BlacklistSnapshot,
): Promise<HomeFeedInitialPayload> {
  const historyRows = await listHistory({ limit: 40 });
  const hasHistoryRows = historyRows.length > 0;

  if (hasHistoryRows) {
    return loadHomeFeedFromHistory(chipId, regionCode, snapshot, historyRows);
  }

  let stale = false;
  let quotaExceeded = false;

  const searchBatch = await aggregateHomeChipSearch(
    chipId,
    regionCode,
    snapshot,
    DEFAULT_VIDEO_GRID_DESIRED,
  );
  const base = searchBatch.items;
  const feedSearchCursor = searchBatch.nextCursor;
  if (searchBatch.stale) stale = true;
  if (searchBatch.quotaExceeded) quotaExceeded = true;

  return {
    feedItems: base,
    historyTail: [],
    feedSearchCursor,
    stale,
    quotaExceeded,
    extraFromHistory: 0,
    hasHistoryRows: false,
  };
}

/**
 * Una ronda de similares desde el historial (rotación por `seedRoundIndex`),
 * para mezclar con el scroll de búsqueda del chip.
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

/** Tanda de scroll mezclada (~65% historial + ~35% genérico). */
export async function loadBlendedHomeScrollBatch(
  chipId: HomeFeedChipId,
  regionCode: string,
  snapshot: BlacklistSnapshot,
  excludeIds: Set<string>,
  seedRoundIndex: number,
  batchSize: number = SCROLL_AGGREGATE_BATCH,
): Promise<{
  videos: VideoDTO[];
  stale: boolean;
  quotaExceeded: boolean;
  nextSeedIndex: number;
}> {
  const historyMax = homeFeedHistoryBudget(batchSize);
  const genericMax = homeFeedGenericBudget(batchSize);

  const related = await loadMoreHistoryRelatedChunk(
    snapshot,
    new Set(excludeIds),
    seedRoundIndex,
    historyMax,
  );
  let stale = related.stale;
  let quotaExceeded = related.quotaExceeded;
  const historyVideos = [...related.videos];

  if (historyVideos.length < historyMax) {
    const fill = await appendSearchFromHistory(
      snapshot,
      excludeIds,
      historyMax - historyVideos.length,
    );
    if (fill.stale) stale = true;
    if (fill.quotaExceeded) quotaExceeded = true;
    for (const v of fill.items) {
      if (excludeIds.has(v.id)) continue;
      excludeIds.add(v.id);
      historyVideos.push(v);
      if (historyVideos.length >= historyMax) break;
    }
  }

  let genericItems: VideoDTO[] = [];
  if (genericMax > 0) {
    const searchBatch = await aggregateHomeChipSearch(
      chipId,
      regionCode,
      snapshot,
      genericMax,
      undefined,
      excludeIds,
    );
    genericItems = searchBatch.items;
    if (searchBatch.stale) stale = true;
    if (searchBatch.quotaExceeded) quotaExceeded = true;
  }

  const videos = interleaveHistoryAndGeneric(historyVideos, genericItems);

  return {
    videos,
    stale,
    quotaExceeded,
    nextSeedIndex: related.nextSeedIndex,
  };
}

/** Más vídeos por búsqueda del chip (scroll infinito). */
export async function loadMoreHomeFeedFromChip(
  chipId: HomeFeedChipId,
  regionCode: string,
  snapshot: BlacklistSnapshot,
  cursor: HomeFeedSearchCursor,
): Promise<{
  feedItems: VideoDTO[];
  feedSearchCursor: HomeFeedSearchCursor | null;
  stale: boolean;
  quotaExceeded: boolean;
}> {
  const batch = await loadMoreHomeFeedSearch(
    chipId,
    regionCode,
    snapshot,
    cursor,
  );
  return {
    feedItems: batch.items,
    feedSearchCursor: batch.nextCursor,
    stale: batch.stale,
    quotaExceeded: batch.quotaExceeded,
  };
}
