import { getPeketubeDb } from "@/lib/db/schema";
import type { PeketubeSettings } from "@/lib/db/settings";
import { getSettingsFromDexie } from "@/lib/db/settings";
import type {
  NotificationItemDTO,
  PageDTO,
  VideoCommentDTO,
  VideoDTO,
  ChannelDTO,
} from "@/lib/yt/types";

export type FetchMeta = {
  stale?: boolean;
  quotaExceeded?: boolean;
  guestQuotaExceeded?: boolean;
};

export function isYouTubeAuthError(e: unknown): boolean {
  return e instanceof Error && e.message === "AUTH_REQUIRED";
}

export function isGuestQuotaError(e: unknown): boolean {
  return e instanceof Error && e.message === "GUEST_QUOTA_EXCEEDED";
}

export function isGuestUnavailableError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  return (
    e.message.includes("Modo invitado no está disponible") ||
    e.message.includes("Modo invitado no disponible")
  );
}

type ApiErrorBody = {
  error?: string;
  message?: string;
  quotaExceeded?: boolean;
  guestMode?: boolean;
};

export async function fetchJsonWithCache<T>(
  cacheKey: string,
  ttlMs: number,
  url: string,
): Promise<{ data: T } & FetchMeta> {
  const dex = getPeketubeDb();
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
    const res = await fetch(url, { credentials: "same-origin" });
    const body = (await res.json()) as T & ApiErrorBody;
    if (!res.ok) {
      const apiBody = body as ApiErrorBody;
      const guestQuotaExceeded =
        apiBody.error === "GUEST_QUOTA_EXCEEDED" ||
        (apiBody.guestMode === true && apiBody.quotaExceeded === true);
      const quotaExceeded =
        guestQuotaExceeded ||
        res.status === 429 ||
        apiBody.quotaExceeded === true;
      if (guestQuotaExceeded) {
        throw new Error("GUEST_QUOTA_EXCEEDED");
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error("AUTH_REQUIRED");
      }
      if (apiBody.error === "GUEST_UNAVAILABLE") {
        throw new Error(
          apiBody.message ??
            "Modo invitado no disponible. Conecta tu cuenta de Google.",
        );
      }
      if (stalePayload !== undefined && !quotaExceeded) {
        return { data: stalePayload, stale: true, quotaExceeded };
      }
      const msg =
        typeof body === "object" && body && "message" in body
          ? String(apiBody.message ?? res.statusText)
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
    if (isYouTubeAuthError(e)) throw e;
    if (stalePayload !== undefined) return { data: stalePayload, stale: true };
    throw e;
  }
}

function appendSettingsQuery(sp: URLSearchParams, s: PeketubeSettings) {
  sp.set("categoryIds", s.allowedCategoryIds.join(","));
  if (s.strictKidsOnly) sp.set("strictKids", "1");
  sp.set("regionCode", s.regionCode);
  sp.set("relevanceLanguage", s.relevanceLanguage);
}

/** Metadatos de vídeo en lista de bloqueados (no aplicar filtro madeForKids). */
function appendSettingsQueryNoStrictKids(
  sp: URLSearchParams,
  s: PeketubeSettings,
) {
  sp.set("categoryIds", s.allowedCategoryIds.join(","));
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
  const cacheKey = `feed:${videoCategoryId}:${pageToken ?? ""}:${s.strictKidsOnly}:${s.regionCode}:${s.relevanceLanguage}:${s.allowedCategoryIds.join(",")}`;
  return fetchJsonWithCache(cacheKey, s.feedTtlMs, url);
}

export type SearchFetchOptions = {
  videoDuration?: "short" | "medium" | "long";
};

export async function fetchSearchPage(
  q: string,
  pageToken?: string,
  opts?: SearchFetchOptions,
): Promise<{ data: PageDTO<VideoDTO> } & FetchMeta> {
  const s = await getSettingsFromDexie();
  const sp = new URLSearchParams();
  sp.set("q", q);
  appendSettingsQuery(sp, s);
  if (pageToken) sp.set("pageToken", pageToken);
  if (opts?.videoDuration) sp.set("videoDuration", opts.videoDuration);
  const url = `/api/yt/search?${sp.toString()}`;
  const vd = opts?.videoDuration ?? "";
  const cacheKey = `search:${q}:${pageToken ?? ""}:${vd}:${s.strictKidsOnly}:${s.regionCode}:${s.allowedCategoryIds.join(",")}`;
  return fetchJsonWithCache(cacheKey, s.feedTtlMs, url);
}

export type SubscriptionListItem = {
  subscriptionId: string;
  channelId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
};

export type SubscriptionsPageDTO = {
  items: SubscriptionListItem[];
  nextPageToken?: string;
  prevPageToken?: string;
};

export async function fetchSubscriptionsPage(
  pageToken?: string,
): Promise<{ data: SubscriptionsPageDTO } & FetchMeta> {
  const s = await getSettingsFromDexie();
  const sp = new URLSearchParams();
  if (pageToken) sp.set("pageToken", pageToken);
  const url = `/api/yt/subscriptions?${sp.toString()}`;
  const cacheKey = `subscriptions:${pageToken ?? ""}`;
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

/** Metadatos para /parental/blocked (vídeos no infantiles visibles al padre). */
export async function fetchVideoByIdBlockedPreview(
  id: string,
): Promise<{ data: VideoDTO } & FetchMeta> {
  const s = await getSettingsFromDexie();
  const sp = new URLSearchParams();
  appendSettingsQueryNoStrictKids(sp, s);
  const url = `/api/yt/video/${encodeURIComponent(id)}?${sp.toString()}`;
  const cacheKey = `video:blockedPreview:${id}`;
  return fetchJsonWithCache(cacheKey, s.videoTtlMs, url);
}

export async function fetchChannelById(
  id: string,
): Promise<{ data: ChannelDTO } & FetchMeta> {
  const s = await getSettingsFromDexie();
  const url = `/api/yt/channel/${encodeURIComponent(id)}`;
  const cacheKey = `channel:${id}`;
  return fetchJsonWithCache(cacheKey, s.videoTtlMs, url);
}

export async function fetchChannelVideosPage(
  channelId: string,
  uploadsPlaylistId?: string,
  pageToken?: string,
): Promise<{ data: PageDTO<VideoDTO> } & FetchMeta> {
  const s = await getSettingsFromDexie();
  const sp = new URLSearchParams();
  if (s.strictKidsOnly) sp.set("strictKids", "1");
  if (uploadsPlaylistId) sp.set("uploads", uploadsPlaylistId);
  if (pageToken) sp.set("pageToken", pageToken);
  const url = `/api/yt/channel/${encodeURIComponent(channelId)}/videos?${sp.toString()}`;
  const cacheKey = `channelVideos:${channelId}:${pageToken ?? ""}:${s.strictKidsOnly}`;
  return fetchJsonWithCache(cacheKey, s.feedTtlMs, url);
}

export async function fetchRelatedVideos(
  videoId: string,
  title: string,
  channelId: string,
): Promise<{ data: PageDTO<VideoDTO> } & FetchMeta> {
  const s = await getSettingsFromDexie();
  const sp = new URLSearchParams();
  sp.set("videoId", videoId);
  sp.set("title", title);
  sp.set("channelId", channelId);
  appendSettingsQuery(sp, s);
  const url = `/api/yt/related?${sp.toString()}`;
  const cacheKey = `related:${videoId}:${title.slice(0, 40)}:${channelId}:${s.strictKidsOnly}`;
  return fetchJsonWithCache(cacheKey, s.videoTtlMs, url);
}

export async function fetchVideoComments(
  videoId: string,
): Promise<{ data: { items: VideoCommentDTO[] } } & FetchMeta> {
  const s = await getSettingsFromDexie();
  const url = `/api/yt/video/${encodeURIComponent(videoId)}/comments`;
  const cacheKey = `comments:${videoId}`;
  return fetchJsonWithCache(cacheKey, s.feedTtlMs, url);
}

export async function fetchNotifications(
  maxResults = 20,
): Promise<{ data: { items: NotificationItemDTO[] } } & FetchMeta> {
  const s = await getSettingsFromDexie();
  const sp = new URLSearchParams();
  sp.set("maxResults", String(maxResults));
  const url = `/api/yt/notifications?${sp.toString()}`;
  return fetchJsonWithCache(
    `notifications:${maxResults}:${s.showVideoComments}`,
    60_000,
    url,
  );
}
