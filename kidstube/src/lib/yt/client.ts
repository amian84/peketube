import { getKidstubeDb } from "@/lib/db/schema";
import type { KidstubeSettings } from "@/lib/db/settings";
import { getSettingsFromDexie } from "@/lib/db/settings";
import type { PageDTO, VideoDTO } from "@/lib/yt/types";

export type FetchMeta = { stale?: boolean; quotaExceeded?: boolean };

export async function fetchJsonWithCache<T>(
  cacheKey: string,
  ttlMs: number,
  url: string,
): Promise<{ data: T } & FetchMeta> {
  const dex = getKidstubeDb();
  const now = Date.now();
  let stalePayload: T | undefined;
  if (dex) {
    const row = await dex.apiCache.get(cacheKey);
    if (row) {
      if (row.expiresAt > now) return { data: row.payload as T };
      stalePayload = row.payload as T;
    }
  }
  try {
    const res = await fetch(url);
    const body = (await res.json()) as T & { quotaExceeded?: boolean };
    if (!res.ok) {
      const quotaExceeded = res.status === 429 || body?.quotaExceeded === true;
      if (stalePayload !== undefined) {
        return { data: stalePayload, stale: true, quotaExceeded };
      }
      const msg =
        typeof body === "object" && body && "message" in body
          ? String((body as { message?: string }).message ?? res.statusText)
          : res.statusText;
      throw new Error(msg);
    }
    if (dex) {
      await dex.apiCache.put({
        key: cacheKey,
        payload: body,
        expiresAt: now + ttlMs,
      });
    }
    return { data: body as T };
  } catch (e) {
    if (stalePayload !== undefined) return { data: stalePayload, stale: true };
    throw e;
  }
}

function appendSettingsQuery(sp: URLSearchParams, s: KidstubeSettings) {
  sp.set("categoryIds", s.allowedCategoryIds.join(","));
  if (s.strictKidsOnly) sp.set("strictKids", "1");
  sp.set("regionCode", s.regionCode);
  sp.set("relevanceLanguage", s.relevanceLanguage);
}

export async function fetchFeedPage(
  videoCategoryId: number,
  pageToken?: string,
): Promise<{ data: PageDTO<VideoDTO> } & FetchMeta> {
  const s = await getSettingsFromDexie();
  const sp = new URLSearchParams();
  sp.set("videoCategoryId", String(videoCategoryId));
  appendSettingsQuery(sp, s);
  if (pageToken) sp.set("pageToken", pageToken);
  const url = `/api/yt/feed?${sp.toString()}`;
  const cacheKey = `feed:${videoCategoryId}:${pageToken ?? ""}:${s.strictKidsOnly}:${s.regionCode}`;
  return fetchJsonWithCache(cacheKey, s.feedTtlMs, url);
}

export async function fetchSearchPage(
  q: string,
  pageToken?: string,
): Promise<{ data: PageDTO<VideoDTO> } & FetchMeta> {
  const s = await getSettingsFromDexie();
  const sp = new URLSearchParams();
  sp.set("q", q);
  appendSettingsQuery(sp, s);
  if (pageToken) sp.set("pageToken", pageToken);
  const url = `/api/yt/search?${sp.toString()}`;
  const cacheKey = `search:${q}:${pageToken ?? ""}:${s.strictKidsOnly}:${s.regionCode}:${s.allowedCategoryIds.join(",")}`;
  return fetchJsonWithCache(cacheKey, s.feedTtlMs, url);
}

export async function fetchVideoById(
  id: string,
): Promise<{ data: VideoDTO } & FetchMeta> {
  const s = await getSettingsFromDexie();
  const sp = new URLSearchParams();
  appendSettingsQuery(sp, s);
  const url = `/api/yt/video/${encodeURIComponent(id)}?${sp.toString()}`;
  const cacheKey = `video:${id}:${s.strictKidsOnly}`;
  return fetchJsonWithCache(cacheKey, s.videoTtlMs, url);
}
