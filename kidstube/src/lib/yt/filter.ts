import type { NotificationItemDTO, VideoDTO } from "@/lib/yt/types";

export type BlacklistSnapshot = {
  channels: Set<string>;
  videos: Set<string>;
  /** Términos normalizados en minúsculas; `includes` sobre el título en minúsculas. */
  titleKeywords: Set<string>;
};

export type BlacklistWire = {
  channelIds: string[];
  videoIds: string[];
  titleKeywords: string[];
};

export function emptyBlacklistSnapshot(): BlacklistSnapshot {
  return {
    channels: new Set(),
    videos: new Set(),
    titleKeywords: new Set(),
  };
}

export function snapshotFromWire(w: BlacklistWire): BlacklistSnapshot {
  return {
    channels: new Set(w.channelIds ?? []),
    videos: new Set(w.videoIds ?? []),
    titleKeywords: new Set(
      (w.titleKeywords ?? []).map((k) => k.trim().toLowerCase()).filter(Boolean),
    ),
  };
}

export function snapshotToWire(s: BlacklistSnapshot): BlacklistWire {
  return {
    channelIds: Array.from(s.channels),
    videoIds: Array.from(s.videos),
    titleKeywords: Array.from(s.titleKeywords),
  };
}

export function applyBlacklist(
  items: VideoDTO[],
  bl: BlacklistSnapshot,
): VideoDTO[] {
  return items.filter((v) => !isVideoBlacklisted(v, bl));
}

export function isVideoBlacklisted(
  video: VideoDTO,
  bl: BlacklistSnapshot,
): boolean {
  if (bl.videos.has(video.id)) return true;
  if (bl.channels.has(video.channelId)) return true;
  const t = video.title.toLowerCase();
  for (const kw of Array.from(bl.titleKeywords)) {
    if (kw && t.includes(kw)) return true;
  }
  return false;
}

export function applyBlacklistToNotifications(
  items: NotificationItemDTO[],
  bl: BlacklistSnapshot,
): NotificationItemDTO[] {
  return items.filter((n) => {
    if (n.videoId && bl.videos.has(n.videoId)) return false;
    if (n.channelId && bl.channels.has(n.channelId)) return false;
  const t = `${n.title}\n${n.subtitle}`.toLowerCase();
  for (const kw of Array.from(bl.titleKeywords)) {
      if (kw && t.includes(kw)) return false;
    }
    return true;
  });
}
