import type { FetchMeta, SubscriptionListItem } from "@/lib/yt/client";
import type { PageDTO, VideoDTO } from "@/lib/yt/types";
import { applyBlacklist, type BlacklistSnapshot } from "@/lib/yt/filter";

export const DEFAULT_VIDEO_GRID_DESIRED = 24;
export const DEFAULT_SHORTS_DESIRED = 16;
export const DEFAULT_SUBSCRIPTIONS_DESIRED = 30;
/** Tamaño típico de cada “cargar más” (scroll infinito). */
export const SCROLL_AGGREGATE_BATCH = 16;

/** Límite de páginas YouTube por petición agregada (cuota + UX). */
const AGGREGATE_MAX_PAGES = 28;

export type AggregatedMeta = {
  stale?: boolean;
  quotaExceeded?: boolean;
  /** Token para la siguiente petición (scroll infinito). */
  nextPageToken?: string;
};

export type AggregateFilteredVideosOptions = {
  /** Continuar la lista popular desde este token (p. ej. “cargar más”). */
  initialPageToken?: string;
};

/**
 * Pide páginas consecutivas hasta tener `desired` vídeos tras blacklist, o agotar tokens.
 */
export async function aggregateFilteredVideos(
  load: (
    pageToken?: string,
  ) => Promise<{ data: PageDTO<VideoDTO> } & FetchMeta>,
  bl: BlacklistSnapshot,
  desired: number,
  options?: AggregateFilteredVideosOptions,
): Promise<{ items: VideoDTO[] } & AggregatedMeta> {
  const out: VideoDTO[] = [];
  let token: string | undefined = options?.initialPageToken;
  const seen = new Set<string>();
  let stale = false;
  let quotaExceeded = false;
  let emptyUniqueStreak = 0;
  let lastNextPageToken: string | undefined;

  for (let page = 0; page < AGGREGATE_MAX_PAGES; page++) {
    const requestedToken = token;
    let data: PageDTO<VideoDTO>;
    let st: boolean | undefined;
    let q: boolean | undefined;
    try {
      const result = await load(token);
      data = result.data;
      st = result.stale;
      q = result.quotaExceeded;
    } catch {
      break;
    }
    if (st) stale = true;
    if (q) quotaExceeded = true;
    lastNextPageToken = data.nextPageToken;
    const filtered = applyBlacklist(data.items, bl);
    let addedUnique = 0;
    for (const v of filtered) {
      if (seen.has(v.id)) continue;
      seen.add(v.id);
      out.push(v);
      addedUnique++;
      if (out.length >= desired) {
        return {
          items: out.slice(0, desired),
          stale,
          quotaExceeded,
          nextPageToken: data.nextPageToken,
        };
      }
    }
    if (addedUnique === 0) {
      emptyUniqueStreak++;
      if (emptyUniqueStreak >= 5) {
        break;
      }
    } else {
      emptyUniqueStreak = 0;
    }
    const next = data.nextPageToken;
    if (!next) break;
    if (next === requestedToken) break;
    token = next;
  }
  return {
    items: out,
    stale,
    quotaExceeded,
    nextPageToken: lastNextPageToken,
  };
}

export async function aggregateFilteredSubscriptionChannels(
  load: (pageToken?: string) => Promise<{
    data: { items: SubscriptionListItem[]; nextPageToken?: string };
  } & FetchMeta>,
  bl: BlacklistSnapshot,
  desired: number,
): Promise<{ items: SubscriptionListItem[] } & AggregatedMeta> {
  const out: SubscriptionListItem[] = [];
  let token: string | undefined;
  const seen = new Set<string>();
  let stale = false;
  let quotaExceeded = false;
  let emptyUniqueStreak = 0;

  for (let page = 0; page < AGGREGATE_MAX_PAGES; page++) {
    const requestedToken = token;
    const { data, stale: st, quotaExceeded: q } = await load(token);
    if (st) stale = true;
    if (q) quotaExceeded = true;
    const filtered = data.items.filter((ch) => !bl.channels.has(ch.channelId));
    let addedUnique = 0;
    for (const ch of filtered) {
      if (seen.has(ch.channelId)) continue;
      seen.add(ch.channelId);
      out.push(ch);
      addedUnique++;
      if (out.length >= desired) {
        return {
          items: out.slice(0, desired),
          stale,
          quotaExceeded,
        };
      }
    }
    if (addedUnique === 0) {
      emptyUniqueStreak++;
      if (emptyUniqueStreak >= 5) break;
    } else {
      emptyUniqueStreak = 0;
    }
    const next = data.nextPageToken;
    if (!next) break;
    if (next === requestedToken) break;
    token = next;
  }
  return { items: out, stale, quotaExceeded };
}
