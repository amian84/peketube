import type { ChannelDTO, PlaylistItemDTO, VideoDTO } from "./types";

/** ISO 8601 duration (PT1H2M3S) → segundos */
export function parseIsoDuration(iso: string | undefined): number | undefined {
  if (!iso || !iso.startsWith("P")) return undefined;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return undefined;
  const h = parseInt(m[1] ?? "0", 10) || 0;
  const min = parseInt(m[2] ?? "0", 10) || 0;
  const s = parseInt(m[3] ?? "0", 10) || 0;
  return h * 3600 + min * 60 + s;
}

function bestThumbnail(thumbnails: Record<string, { url?: string }> | undefined) {
  if (!thumbnails) return "";
  return (
    thumbnails.maxres?.url ??
    thumbnails.high?.url ??
    thumbnails.medium?.url ??
    thumbnails.default?.url ??
    ""
  );
}

export function mapVideoResource(v: {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    channelId?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: Record<string, { url?: string }>;
  };
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string };
  status?: { selfDeclaredMadeForKids?: boolean; madeForKids?: boolean };
}): VideoDTO {
  const sn = v.snippet;
  const madeForKids =
    v.status?.madeForKids ?? v.status?.selfDeclaredMadeForKids ?? undefined;
  return {
    id: v.id,
    title: sn?.title ?? "",
    description: sn?.description ?? "",
    channelId: sn?.channelId ?? "",
    channelTitle: sn?.channelTitle ?? "",
    thumbnailUrl: bestThumbnail(sn?.thumbnails),
    publishedAt: sn?.publishedAt ?? "",
    durationSec: parseIsoDuration(v.contentDetails?.duration),
    viewCount: v.statistics?.viewCount,
    madeForKids,
  };
}

export function mapSearchItemToVideoDTO(item: {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    description?: string;
    channelId?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: Record<string, { url?: string }>;
  };
}): VideoDTO | null {
  const id = item.id?.videoId;
  if (!id) return null;
  const sn = item.snippet;
  return {
    id,
    title: sn?.title ?? "",
    description: sn?.description ?? "",
    channelId: sn?.channelId ?? "",
    channelTitle: sn?.channelTitle ?? "",
    thumbnailUrl: bestThumbnail(sn?.thumbnails),
    publishedAt: sn?.publishedAt ?? "",
  };
}

export function mapChannelResource(c: {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    thumbnails?: Record<string, { url?: string }>;
  };
  statistics?: { subscriberCount?: string; videoCount?: string };
}): ChannelDTO {
  const sn = c.snippet;
  return {
    id: c.id,
    title: sn?.title ?? "",
    description: sn?.description ?? "",
    thumbnailUrl: bestThumbnail(sn?.thumbnails),
    subscriberCount: c.statistics?.subscriberCount,
    videoCount: c.statistics?.videoCount,
  };
}

export function mapPlaylistItemResource(
  item: {
    snippet?: {
      title?: string;
      channelId?: string;
      channelTitle?: string;
      publishedAt?: string;
      thumbnails?: Record<string, { url?: string }>;
      resourceId?: { videoId?: string };
    };
    contentDetails?: { videoId?: string };
  },
  position: number,
): PlaylistItemDTO | null {
  const videoId =
    item.snippet?.resourceId?.videoId ?? item.contentDetails?.videoId;
  if (!videoId) return null;
  const sn = item.snippet;
  return {
    videoId,
    title: sn?.title ?? "",
    channelId: sn?.channelId ?? "",
    channelTitle: sn?.channelTitle ?? "",
    thumbnailUrl: bestThumbnail(sn?.thumbnails),
    publishedAt: sn?.publishedAt ?? "",
    position,
  };
}
