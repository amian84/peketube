import type { FetchMeta, SubscriptionListItem } from "@/lib/yt/client";
import type { PageDTO, VideoDTO } from "@/lib/yt/types";
import { applyBlacklist, type BlacklistSnapshot } from "@/lib/yt/filter";

export const DEFAULT_VIDEO_GRID_DESIRED = 24;
export const DEFAULT_SHORTS_DESIRED = 16;
export const DEFAULT_SUBSCRIPTIONS_DESIRED = 30;

export type AggregatedMeta = { stale?: boolean; quotaExceeded?: boolean };

/**
 * Pide páginas consecutivas hasta tener `desired` vídeos tras blacklist, o agotar tokens.
 */
export async function aggregateFilteredVideos(
  load: (
    pageToken?: string,
  ) => Promise<{ data: PageDTO<VideoDTO> } & FetchMeta>,
  bl: BlacklistSnapshot,
  desired: number,
): Promise<{ items: VideoDTO[] } & AggregatedMeta> {
  const out: VideoDTO[] = [];
  let token: string | undefined;
  const seen = new Set<string>();
  let stale = false;
  let quotaExceeded = false;
  for (;;) {
    const { data, stale: st, quotaExceeded: q } = await load(token);
    if (st) stale = true;
    if (q) quotaExceeded = true;
    const filtered = applyBlacklist(data.items, bl);
    for (const v of filtered) {
      if (seen.has(v.id)) continue;
      seen.add(v.id);
      out.push(v);
      if (out.length >= desired) {
        return {
          items: out.slice(0, desired),
          stale,
          quotaExceeded,
        };
      }
    }
    token = data.nextPageToken;
    if (!token) break;
  }
  return { items: out, stale, quotaExceeded };
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
  for (;;) {
    const { data, stale: st, quotaExceeded: q } = await load(token);
    if (st) stale = true;
    if (q) quotaExceeded = true;
    const filtered = data.items.filter((ch) => !bl.channels.has(ch.channelId));
    for (const ch of filtered) {
      if (seen.has(ch.channelId)) continue;
      seen.add(ch.channelId);
      out.push(ch);
      if (out.length >= desired) {
        return {
          items: out.slice(0, desired),
          stale,
          quotaExceeded,
        };
      }
    }
    token = data.nextPageToken;
    if (!token) break;
  }
  return { items: out, stale, quotaExceeded };
}
