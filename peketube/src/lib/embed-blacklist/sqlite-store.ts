import "server-only";

import { getBlacklistSqlite } from "@/lib/blacklist/sqlite-store";

let schemaReady = false;

function ensureSchema() {
  if (schemaReady) return;
  const db = getBlacklistSqlite();
  db.exec(`
    CREATE TABLE IF NOT EXISTS embed_blacklist (
      video_id TEXT PRIMARY KEY NOT NULL,
      reason TEXT,
      title TEXT,
      channel_id TEXT,
      channel_title TEXT,
      thumbnail_url TEXT,
      source TEXT NOT NULL DEFAULT 'auto',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS embed_blacklist_channels (
      channel_id TEXT PRIMARY KEY NOT NULL,
      title TEXT,
      thumbnail_url TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
  // Migración: añade thumbnail_url a tablas creadas antes de esta columna.
  const vCols = db.prepare(`PRAGMA table_info(embed_blacklist)`).all() as {
    name: string;
  }[];
  if (!vCols.some((c) => c.name === "thumbnail_url")) {
    db.exec(`ALTER TABLE embed_blacklist ADD COLUMN thumbnail_url TEXT`);
  }
  schemaReady = true;
}

export type EmbedBlockedVideo = {
  videoId: string;
  reason: string | null;
  title: string | null;
  channelId: string | null;
  channelTitle: string | null;
  thumbnailUrl: string | null;
  source: string;
  createdAt: number;
};

export type EmbedBlockedChannel = {
  channelId: string;
  title: string | null;
  thumbnailUrl: string | null;
  source: string;
  createdAt: number;
};

export type EmbedBlockedVideoInput = {
  videoId: string;
  reason?: string | null;
  title?: string | null;
  channelId?: string | null;
  channelTitle?: string | null;
  thumbnailUrl?: string | null;
  source?: "auto" | "manual";
};

export type EmbedBlockedChannelInput = {
  channelId: string;
  title?: string | null;
  thumbnailUrl?: string | null;
  source?: "auto" | "manual";
};

export type PageQuery = {
  q?: string;
  limit?: number;
  offset?: number;
};

export type PagedResult<T> = {
  items: T[];
  total: number;
};

const AUTO_MARK_KEY = "embed_auto_mark";
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/** Auto-marcado activado por defecto (true) salvo que se desactive explícitamente. */
export function isEmbedAutoMarkEnabled(): boolean {
  ensureSchema();
  const row = getBlacklistSqlite()
    .prepare(`SELECT value FROM app_settings WHERE key = ?`)
    .get(AUTO_MARK_KEY) as { value: string } | undefined;
  if (!row) return true;
  return row.value !== "0";
}

export function setEmbedAutoMarkEnabled(enabled: boolean): void {
  ensureSchema();
  getBlacklistSqlite()
    .prepare(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(AUTO_MARK_KEY, enabled ? "1" : "0");
}

function clampLimit(limit?: number): number {
  if (!limit || !Number.isFinite(limit) || limit <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(limit), MAX_LIMIT);
}

function clampOffset(offset?: number): number {
  if (!offset || !Number.isFinite(offset) || offset < 0) return 0;
  return Math.floor(offset);
}

// ----- Vídeos -----

export function addEmbedBlocked(input: EmbedBlockedVideoInput): void {
  const videoId = input.videoId.trim();
  if (!videoId) return;
  ensureSchema();
  getBlacklistSqlite()
    .prepare(
      `INSERT INTO embed_blacklist (
         video_id, reason, title, channel_id, channel_title, thumbnail_url, source, created_at
       ) VALUES (@video_id, @reason, @title, @channel_id, @channel_title, @thumbnail_url, @source, @created_at)
       ON CONFLICT(video_id) DO UPDATE SET
         reason = COALESCE(excluded.reason, embed_blacklist.reason),
         title = COALESCE(excluded.title, embed_blacklist.title),
         channel_id = COALESCE(excluded.channel_id, embed_blacklist.channel_id),
         channel_title = COALESCE(excluded.channel_title, embed_blacklist.channel_title),
         thumbnail_url = COALESCE(excluded.thumbnail_url, embed_blacklist.thumbnail_url)`,
    )
    .run({
      video_id: videoId,
      reason: input.reason?.trim() || null,
      title: input.title?.trim() || null,
      channel_id: input.channelId?.trim() || null,
      channel_title: input.channelTitle?.trim() || null,
      thumbnail_url: input.thumbnailUrl?.trim() || null,
      source: input.source === "manual" ? "manual" : "auto",
      created_at: Date.now(),
    });
}

export function removeEmbedBlocked(videoId: string): void {
  const id = videoId.trim();
  if (!id) return;
  ensureSchema();
  getBlacklistSqlite()
    .prepare(`DELETE FROM embed_blacklist WHERE video_id = ?`)
    .run(id);
}

export function clearEmbedBlocked(): void {
  ensureSchema();
  getBlacklistSqlite().prepare(`DELETE FROM embed_blacklist`).run();
}

export function listEmbedBlocked(query: PageQuery = {}): PagedResult<EmbedBlockedVideo> {
  ensureSchema();
  const db = getBlacklistSqlite();
  const limit = clampLimit(query.limit);
  const offset = clampOffset(query.offset);
  const q = query.q?.trim().toLowerCase();
  const where = q
    ? `WHERE lower(video_id) LIKE @like OR lower(COALESCE(title,'')) LIKE @like OR lower(COALESCE(channel_title,'')) LIKE @like OR lower(COALESCE(channel_id,'')) LIKE @like`
    : "";
  const params: Record<string, unknown> = {};
  if (q) params.like = `%${q}%`;

  const total = (
    db
      .prepare(`SELECT COUNT(*) AS n FROM embed_blacklist ${where}`)
      .get(params) as { n: number }
  ).n;

  const rows = db
    .prepare(
      `SELECT video_id, reason, title, channel_id, channel_title, thumbnail_url, source, created_at
       FROM embed_blacklist ${where}
       ORDER BY created_at DESC
       LIMIT @limit OFFSET @offset`,
    )
    .all({ ...params, limit, offset }) as {
    video_id: string;
    reason: string | null;
    title: string | null;
    channel_id: string | null;
    channel_title: string | null;
    thumbnail_url: string | null;
    source: string;
    created_at: number;
  }[];

  return {
    total,
    items: rows.map((r) => ({
      videoId: r.video_id,
      reason: r.reason,
      title: r.title,
      channelId: r.channel_id,
      channelTitle: r.channel_title,
      thumbnailUrl: r.thumbnail_url,
      source: r.source,
      createdAt: r.created_at,
    })),
  };
}

/** Set de IDs de vídeo bloqueados (para filtrar antes de pintar). */
export function getEmbedBlockedIdSet(): Set<string> {
  ensureSchema();
  const rows = getBlacklistSqlite()
    .prepare(`SELECT video_id FROM embed_blacklist`)
    .all() as { video_id: string }[];
  return new Set(rows.map((r) => r.video_id));
}

// ----- Canales -----

export function addEmbedBlockedChannel(input: EmbedBlockedChannelInput): void {
  const channelId = input.channelId.trim();
  if (!channelId) return;
  ensureSchema();
  getBlacklistSqlite()
    .prepare(
      `INSERT INTO embed_blacklist_channels (
         channel_id, title, thumbnail_url, source, created_at
       ) VALUES (@channel_id, @title, @thumbnail_url, @source, @created_at)
       ON CONFLICT(channel_id) DO UPDATE SET
         title = COALESCE(excluded.title, embed_blacklist_channels.title),
         thumbnail_url = COALESCE(excluded.thumbnail_url, embed_blacklist_channels.thumbnail_url)`,
    )
    .run({
      channel_id: channelId,
      title: input.title?.trim() || null,
      thumbnail_url: input.thumbnailUrl?.trim() || null,
      source: input.source === "auto" ? "auto" : "manual",
      created_at: Date.now(),
    });
}

export function removeEmbedBlockedChannel(channelId: string): void {
  const id = channelId.trim();
  if (!id) return;
  ensureSchema();
  getBlacklistSqlite()
    .prepare(`DELETE FROM embed_blacklist_channels WHERE channel_id = ?`)
    .run(id);
}

export function clearEmbedBlockedChannels(): void {
  ensureSchema();
  getBlacklistSqlite().prepare(`DELETE FROM embed_blacklist_channels`).run();
}

export function listEmbedBlockedChannels(
  query: PageQuery = {},
): PagedResult<EmbedBlockedChannel> {
  ensureSchema();
  const db = getBlacklistSqlite();
  const limit = clampLimit(query.limit);
  const offset = clampOffset(query.offset);
  const q = query.q?.trim().toLowerCase();
  const where = q
    ? `WHERE lower(channel_id) LIKE @like OR lower(COALESCE(title,'')) LIKE @like`
    : "";
  const params: Record<string, unknown> = {};
  if (q) params.like = `%${q}%`;

  const total = (
    db
      .prepare(`SELECT COUNT(*) AS n FROM embed_blacklist_channels ${where}`)
      .get(params) as { n: number }
  ).n;

  const rows = db
    .prepare(
      `SELECT channel_id, title, thumbnail_url, source, created_at
       FROM embed_blacklist_channels ${where}
       ORDER BY created_at DESC
       LIMIT @limit OFFSET @offset`,
    )
    .all({ ...params, limit, offset }) as {
    channel_id: string;
    title: string | null;
    thumbnail_url: string | null;
    source: string;
    created_at: number;
  }[];

  return {
    total,
    items: rows.map((r) => ({
      channelId: r.channel_id,
      title: r.title,
      thumbnailUrl: r.thumbnail_url,
      source: r.source,
      createdAt: r.created_at,
    })),
  };
}

/** Set de IDs de canal bloqueados (para filtrar antes de pintar). */
export function getEmbedBlockedChannelIdSet(): Set<string> {
  ensureSchema();
  const rows = getBlacklistSqlite()
    .prepare(`SELECT channel_id FROM embed_blacklist_channels`)
    .all() as { channel_id: string }[];
  return new Set(rows.map((r) => r.channel_id));
}
