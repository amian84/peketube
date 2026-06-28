import "server-only";

import { getBlacklistSqlite } from "@/lib/blacklist/sqlite-store";
import { logServerInfo } from "@/lib/logging/server-log";

const MS_DAY = 86_400_000;

function db() {
  return getBlacklistSqlite();
}

function formatUserIdForLog(userId: string): string {
  if (userId.length <= 12) return userId;
  return `${userId.slice(0, 6)}…${userId.slice(-4)}`;
}

function formatSessionIdForLog(sessionId: string): string {
  if (sessionId.length <= 12) return sessionId;
  return `${sessionId.slice(0, 6)}…${sessionId.slice(-4)}`;
}

function formatUserLabel(userId: string | null): string {
  if (userId) return `user=${formatUserIdForLog(userId)}`;
  return "invitado";
}

type SessionRow = {
  session_id: string;
  user_id: string | null;
  active_seconds: number;
  ended_at: number | null;
};

export function recordOAuthSignIn(
  userId: string,
  email: string | null | undefined,
  now = Date.now(),
): void {
  const sqlite = db();
  const emailNorm = email?.trim() || null;
  const existing = sqlite
    .prepare(`SELECT user_id FROM stats_oauth_user WHERE user_id = ?`)
    .get(userId) as { user_id: string } | undefined;

  const isFirstLogin = !existing;

  if (isFirstLogin) {
    sqlite
      .prepare(
        `INSERT INTO stats_oauth_user (user_id, email, first_seen_at, last_seen_at, login_count)
         VALUES (?, ?, ?, ?, 1)`,
      )
      .run(userId, emailNorm, now, now);
  } else {
    sqlite
      .prepare(
        `UPDATE stats_oauth_user
         SET last_seen_at = ?, login_count = login_count + 1,
             email = COALESCE(?, email)
         WHERE user_id = ?`,
      )
      .run(now, emailNorm, userId);
  }

  sqlite
    .prepare(
      `INSERT INTO stats_login_event (user_id, created_at) VALUES (?, ?)`,
    )
    .run(userId, now);

  logServerInfo(
    "auth",
    isFirstLogin
      ? `Google login (cuenta nueva) user=${formatUserIdForLog(userId)} email=${emailNorm ?? "(sin email)"}`
      : `Google login user=${formatUserIdForLog(userId)} email=${emailNorm ?? "(sin email)"}`,
  );
}

/** Todos los `user_id` registrados en stats para un correo (p. ej. UUIDs viejos + Google sub). */
export function lookupOAuthUserIdsByEmail(email: string): string[] {
  const norm = email.trim().toLowerCase();
  if (!norm) return [];
  const rows = db()
    .prepare(
      `SELECT user_id FROM stats_oauth_user
       WHERE lower(trim(email)) = ?
       ORDER BY last_seen_at DESC`,
    )
    .all(norm) as { user_id: string }[];
  return rows.map((r) => r.user_id);
}

/** Preferir Google `sub` frente a UUID Auth.js para el mismo correo. */
export function lookupStableOAuthUserIdByEmail(email: string): string | null {
  for (const id of lookupOAuthUserIdsByEmail(email)) {
    if (/^\d{10,}$/.test(id)) return id;
  }
  return null;
}

export function recordVideoPlay(
  videoId: string,
  watchSeconds: number,
  userId: string | null,
  now = Date.now(),
): void {
  const id = videoId.trim();
  if (!id) return;
  const sec = Math.max(0, Math.floor(watchSeconds));
  db()
    .prepare(
      `INSERT INTO stats_video_play (user_id, video_id, watch_seconds, created_at)
       VALUES (?, ?, ?, ?)`,
    )
    .run(userId, id, sec, now);
}

export function recordSessionPing(
  sessionId: string,
  userId: string | null,
  deltaSeconds: number,
  now = Date.now(),
  endSession = false,
): void {
  const sid = sessionId.trim();
  if (!sid) return;
  if (!endSession && deltaSeconds <= 0) return;

  const delta =
    deltaSeconds > 0 ? Math.min(Math.floor(deltaSeconds), 300) : 0;
  const sqlite = db();
  const row = sqlite
    .prepare(
      `SELECT session_id, user_id, active_seconds, ended_at
       FROM stats_app_session WHERE session_id = ?`,
    )
    .get(sid) as SessionRow | undefined;

  if (!row) {
    if (delta <= 0) return;
    sqlite
      .prepare(
        `INSERT INTO stats_app_session (session_id, user_id, started_at, last_active_at, active_seconds)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(sid, userId, now, now, delta);
    logServerInfo(
      "session",
      `Sesión iniciada session=${formatSessionIdForLog(sid)} ${formatUserLabel(userId)}`,
    );
    if (endSession) {
      sqlite
        .prepare(`UPDATE stats_app_session SET ended_at = ? WHERE session_id = ?`)
        .run(now, sid);
      logServerInfo(
        "session",
        `Sesión cerrada session=${formatSessionIdForLog(sid)} ${formatUserLabel(userId)} duración=${delta}s`,
      );
    }
    return;
  }

  if (row.ended_at != null) return;

  const effectiveUserId = userId ?? row.user_id;
  if (delta > 0) {
    sqlite
      .prepare(
        `UPDATE stats_app_session
         SET last_active_at = ?,
             active_seconds = active_seconds + ?,
             user_id = COALESCE(?, user_id)
         WHERE session_id = ?`,
      )
      .run(now, delta, userId, sid);
  }

  if (!endSession) return;

  const updated = sqlite
    .prepare(
      `SELECT active_seconds, ended_at FROM stats_app_session WHERE session_id = ?`,
    )
    .get(sid) as { active_seconds: number; ended_at: number | null };
  if (updated.ended_at != null) return;

  sqlite
    .prepare(`UPDATE stats_app_session SET ended_at = ? WHERE session_id = ?`)
    .run(now, sid);
  logServerInfo(
    "session",
    `Sesión cerrada session=${formatSessionIdForLog(sid)} ${formatUserLabel(effectiveUserId)} duración=${updated.active_seconds}s`,
  );
}

import type { OAuthUserStatsRow, UsageStatsSummary } from "@/lib/stats/types";

export type { OAuthUserStatsRow, UsageStatsSummary } from "@/lib/stats/types";

export function listOAuthUsers(): OAuthUserStatsRow[] {
  const rows = db()
    .prepare(
      `SELECT user_id, email, first_seen_at, last_seen_at, login_count
       FROM stats_oauth_user
       ORDER BY last_seen_at DESC`,
    )
    .all() as {
    user_id: string;
    email: string | null;
    first_seen_at: number;
    last_seen_at: number;
    login_count: number;
  }[];
  return rows.map((r) => ({
    userId: r.user_id,
    email: r.email,
    firstSeenAt: r.first_seen_at,
    lastSeenAt: r.last_seen_at,
    loginCount: r.login_count,
  }));
}

function startOfUtcDay(now: number): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function startOfUtcMonth(now: number): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

function countSince(table: string, column: string, since: number): number {
  const row = db()
    .prepare(`SELECT COUNT(*) AS c FROM ${table} WHERE ${column} >= ?`)
    .get(since) as { c: number };
  return row.c;
}

function avgMonthlyCounts(
  table: string,
  timeColumn: string,
  months: number,
  now: number,
): number {
  const since = now - months * 30 * MS_DAY;
  const rows = db()
    .prepare(
      `SELECT strftime('%Y-%m', ${timeColumn} / 1000, 'unixepoch') AS ym, COUNT(*) AS c
       FROM ${table}
       WHERE ${timeColumn} >= ?
       GROUP BY ym`,
    )
    .all(since) as { ym: string; c: number }[];
  if (rows.length === 0) return 0;
  const total = rows.reduce((s, r) => s + r.c, 0);
  return Math.round((total / months) * 100) / 100;
}

export function getUsageStatsSummary(now = Date.now()): UsageStatsSummary {
  const sqlite = db();
  const dayStart = startOfUtcDay(now);
  const monthStart = startOfUtcMonth(now);
  const last30 = now - 30 * MS_DAY;

  const oauthTotal = (
    sqlite.prepare(`SELECT COUNT(*) AS c FROM stats_oauth_user`).get() as {
      c: number;
    }
  ).c;

  const oauthActive30 = (
    sqlite
      .prepare(
        `SELECT COUNT(*) AS c FROM stats_oauth_user WHERE last_seen_at >= ?`,
      )
      .get(last30) as { c: number }
  ).c;

  const loginsToday = countSince("stats_login_event", "created_at", dayStart);
  const loginsMonth = countSince("stats_login_event", "created_at", monthStart);
  const logins30 = countSince("stats_login_event", "created_at", last30);

  const videosToday = countSince("stats_video_play", "created_at", dayStart);
  const videosMonth = countSince("stats_video_play", "created_at", monthStart);
  const videos30 = countSince("stats_video_play", "created_at", last30);

  const videosOauth30 = (
    sqlite
      .prepare(
        `SELECT COUNT(*) AS c FROM stats_video_play WHERE created_at >= ? AND user_id IS NOT NULL`,
      )
      .get(last30) as { c: number }
  ).c;

  const videosGuest30 = (
    sqlite
      .prepare(
        `SELECT COUNT(*) AS c FROM stats_video_play WHERE created_at >= ? AND user_id IS NULL`,
      )
      .get(last30) as { c: number }
  ).c;

  const sessionAvg30Row = sqlite
    .prepare(
      `SELECT AVG(active_seconds) AS avg_sec, COUNT(*) AS n, SUM(active_seconds) AS total_sec
       FROM stats_app_session
       WHERE last_active_at >= ? AND active_seconds > 0`,
    )
    .get(last30) as { avg_sec: number | null; n: number; total_sec: number | null };

  const sessionAvgMonthRow = sqlite
    .prepare(
      `SELECT AVG(active_seconds) AS avg_sec
       FROM stats_app_session
       WHERE last_active_at >= ? AND active_seconds > 0`,
    )
    .get(monthStart) as { avg_sec: number | null };

  return {
    generatedAt: new Date(now).toISOString(),
    oauthUsers: {
      total: oauthTotal,
      activeLast30Days: oauthActive30,
      accounts: listOAuthUsers(),
    },
    logins: {
      today: loginsToday,
      thisMonth: loginsMonth,
      last30Days: logins30,
      avgPerDayLast30: Math.round((logins30 / 30) * 100) / 100,
      avgPerMonthLast12: avgMonthlyCounts(
        "stats_login_event",
        "created_at",
        12,
        now,
      ),
    },
    videos: {
      today: videosToday,
      thisMonth: videosMonth,
      last30Days: videos30,
      avgPerDayLast30: Math.round((videos30 / 30) * 100) / 100,
      avgPerMonthLast12: avgMonthlyCounts(
        "stats_video_play",
        "created_at",
        12,
        now,
      ),
      oauthLast30Days: videosOauth30,
      guestLast30Days: videosGuest30,
    },
    screenTime: {
      sessionsLast30Days: sessionAvg30Row.n,
      avgSessionSecondsLast30: Math.round(sessionAvg30Row.avg_sec ?? 0),
      avgSessionSecondsThisMonth: Math.round(sessionAvgMonthRow.avg_sec ?? 0),
      totalHoursLast30:
        Math.round(((sessionAvg30Row.total_sec ?? 0) / 3600) * 100) / 100,
    },
  };
}
