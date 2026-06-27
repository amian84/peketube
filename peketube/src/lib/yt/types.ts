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
  /** YouTube status.embeddable; false = no reproducible fuera de YouTube. */
  embeddable?: boolean;
}

export interface ChannelDTO {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount?: string;
  /** YouTube oculta el contador de suscriptores para algunos canales. */
  hiddenSubscriberCount?: boolean;
  videoCount?: string;
  /** Banner del canal (`brandingSettings.image.bannerExternalUrl`). */
  bannerUrl?: string;
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
