export interface VideoDTO {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt: string;
  durationSec?: number;
  viewCount?: string;
  madeForKids?: boolean;
}

export interface ChannelDTO {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount?: string;
  videoCount?: string;
  /** Lista de subidas del canal (`playlistItems` sobre este id). */
  uploadsPlaylistId?: string;
}

export interface PlaylistItemDTO {
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt: string;
  position: number;
}

export interface PageDTO<T> {
  items: T[];
  nextPageToken?: string;
  prevPageToken?: string;
  /** OQ-01-005 C — el cliente puede mostrar banner si viene true */
  stale?: boolean;
  quotaExceeded?: boolean;
}

export interface ApiErrorBody {
  error: string;
  message?: string;
  status?: number;
}

export type VideoCommentDTO = {
  id: string;
  authorDisplayName: string;
  text: string;
  publishedAt: string;
};

/** Actividad tipo “centro de notificaciones” (activities.list mine=true). */
export type NotificationItemDTO = {
  id: string;
  activityType: string;
  title: string;
  subtitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  videoId?: string;
  channelId?: string;
};
