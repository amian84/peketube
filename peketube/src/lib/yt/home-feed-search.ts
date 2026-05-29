import type { HomeFeedChipId } from "@/lib/yt/home-chips";
import { getHomeSeedQueries } from "@/lib/yt/home-feed-seeds";
import {
  aggregateFilteredVideos,
  SCROLL_AGGREGATE_BATCH,
} from "@/lib/yt/fill-filtered-page";
import { fetchSearchPage } from "@/lib/yt/client";
import type { BlacklistSnapshot } from "@/lib/yt/filter";
import type { VideoDTO } from "@/lib/yt/types";

export type HomeFeedSearchCursor = {
  queryIndex: number;
  pageToken?: string;
};

export type HomeFeedSearchBatch = {
  items: VideoDTO[];
  nextCursor: HomeFeedSearchCursor | null;
  stale: boolean;
  quotaExceeded: boolean;
};

/**
 * Agrega vídeos desde las consultas del chip (rotación query + pageToken).
 * `nextCursor: null` = no hay más páginas en ninguna consulta.
 */
export async function aggregateHomeChipSearch(
  chipId: HomeFeedChipId,
  regionCode: string,
  snapshot: BlacklistSnapshot,
  desired: number,
  startCursor?: HomeFeedSearchCursor,
  excludeIds?: ReadonlySet<string>,
): Promise<HomeFeedSearchBatch> {
  const queries = getHomeSeedQueries(chipId, regionCode);
  if (queries.length === 0) {
    return {
      items: [],
      nextCursor: null,
      stale: false,
      quotaExceeded: false,
    };
  }

  const out: VideoDTO[] = [];
  const seen = new Set<string>(excludeIds ?? []);
  let stale = false;
  let quotaExceeded = false;
  let queryIndex = startCursor?.queryIndex ?? 0;
  let pageToken = startCursor?.pageToken;

  while (out.length < desired && queryIndex < queries.length) {
    const q = queries[queryIndex]!;
    try {
      const result = await aggregateFilteredVideos(
        (token) => fetchSearchPage(q, token),
        snapshot,
        desired - out.length,
        pageToken ? { initialPageToken: pageToken } : undefined,
      );
      if (result.stale) stale = true;
      if (result.quotaExceeded) quotaExceeded = true;
      for (const v of result.items) {
        if (seen.has(v.id)) continue;
        seen.add(v.id);
        out.push(v);
      }

      if (out.length >= desired) {
        const nextCursor: HomeFeedSearchCursor | null = result.nextPageToken
          ? { queryIndex, pageToken: result.nextPageToken }
          : queryIndex + 1 < queries.length
            ? { queryIndex: queryIndex + 1 }
            : null;
        return {
          items: out.slice(0, desired),
          nextCursor,
          stale,
          quotaExceeded,
        };
      }

      if (result.nextPageToken) {
        pageToken = result.nextPageToken;
        continue;
      }

      queryIndex++;
      pageToken = undefined;
    } catch {
      queryIndex++;
      pageToken = undefined;
    }
  }

  const nextCursor: HomeFeedSearchCursor | null =
    queryIndex < queries.length ? { queryIndex, pageToken } : null;

  return {
    items: out,
    nextCursor: out.length > 0 ? nextCursor : null,
    stale,
    quotaExceeded,
  };
}

/** Scroll: siguiente tanda de búsqueda del chip. */
export async function loadMoreHomeFeedSearch(
  chipId: HomeFeedChipId,
  regionCode: string,
  snapshot: BlacklistSnapshot,
  cursor: HomeFeedSearchCursor,
): Promise<HomeFeedSearchBatch> {
  return aggregateHomeChipSearch(
    chipId,
    regionCode,
    snapshot,
    SCROLL_AGGREGATE_BATCH,
    cursor,
  );
}

/** Una consulta del chip (suplemento al hacer scroll sin historial). */
export async function loadChipSearchSupplementBatch(
  chipId: HomeFeedChipId,
  regionCode: string,
  snapshot: BlacklistSnapshot,
  queryIndex: number,
  pageToken?: string,
) {
  const queries = getHomeSeedQueries(chipId, regionCode);
  if (queries.length === 0) {
    return {
      items: [] as VideoDTO[],
      nextPageToken: undefined as string | undefined,
      stale: false,
      quotaExceeded: false,
      nextQueryIndex: 0,
    };
  }
  const idx = ((queryIndex % queries.length) + queries.length) % queries.length;
  const q = queries[idx]!;
  const agg = await aggregateFilteredVideos(
    (token) => fetchSearchPage(q, token),
    snapshot,
    SCROLL_AGGREGATE_BATCH,
    pageToken ? { initialPageToken: pageToken } : undefined,
  );
  return {
    items: agg.items,
    nextPageToken: agg.nextPageToken,
    stale: !!agg.stale,
    quotaExceeded: !!agg.quotaExceeded,
    nextQueryIndex: agg.nextPageToken ? idx : idx + 1,
  };
}
