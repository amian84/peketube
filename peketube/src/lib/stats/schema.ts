import type Database from "better-sqlite3";

export function ensureStatsSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stats_oauth_user (
      user_id TEXT PRIMARY KEY NOT NULL,
      email TEXT,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      login_count INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS stats_login_event (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_stats_login_created
      ON stats_login_event(created_at);

    CREATE TABLE IF NOT EXISTS stats_video_play (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      video_id TEXT NOT NULL,
      watch_seconds INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_stats_video_created
      ON stats_video_play(created_at);

    CREATE TABLE IF NOT EXISTS stats_app_session (
      session_id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      started_at INTEGER NOT NULL,
      last_active_at INTEGER NOT NULL,
      active_seconds INTEGER NOT NULL DEFAULT 0,
      ended_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_stats_session_last_active
      ON stats_app_session(last_active_at);
  `);

  const sessionCols = db
    .prepare(`PRAGMA table_info(stats_app_session)`)
    .all() as { name: string }[];
  if (!sessionCols.some((c) => c.name === "ended_at")) {
    db.exec(`ALTER TABLE stats_app_session ADD COLUMN ended_at INTEGER`);
  }
}
