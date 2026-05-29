/** Fila de historial (cliente Dexie y wire API). */
export type WatchHistoryWire = {
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSec?: number;
  watchedAt: number;
  progressSec: number;
};

export type WatchHistoryListResponse = {
  items: WatchHistoryWire[];
};
