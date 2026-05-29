import type Database from "better-sqlite3";

export function ensureWatchHistorySchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS watch_history (
      user_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      title TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      channel_title TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL,
      duration_sec INTEGER,
      watched_at INTEGER NOT NULL,
      progress_sec INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, video_id)
    );
    CREATE INDEX IF NOT EXISTS idx_watch_history_user_watched
      ON watch_history (user_id, watched_at DESC);
  `);
}
