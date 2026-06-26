/** @vitest-environment node */

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import fs from "fs";
import os from "os";
import path from "path";

describe("stats store", () => {
  it("registra oauth, logins, vídeos y sesiones", async () => {
    vi.resetModules();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "peketube-stats-"));
    const dbPath = path.join(dir, "test.sqlite");
    const logsDir = path.join(dir, "logs");
    const prevDb = process.env.PEKETUBE_SERVER_DB_PATH;
    const prevLog = process.env.PEKETUBE_LOG_DIR;
    process.env.PEKETUBE_SERVER_DB_PATH = dbPath;
    process.env.PEKETUBE_LOG_DIR = logsDir;

    const { ensureStatsSchema } = await import("@/lib/stats/schema");
    const Database = (await import("better-sqlite3")).default;
    const instance = new Database(dbPath);
    ensureStatsSchema(instance);
    instance.close();

    const {
      recordOAuthSignIn,
      recordSessionPing,
      recordVideoPlay,
      getUsageStatsSummary,
    } = await import("@/lib/stats/store");

    const now = Date.UTC(2026, 5, 26, 12, 0, 0);
    recordOAuthSignIn("google-sub-1", "a@test.com", now);
    recordOAuthSignIn("google-sub-1", "a@test.com", now + 1000);
    recordVideoPlay("vid1", 12, "google-sub-1", now);
    recordVideoPlay("vid2", 5, null, now);
    recordSessionPing("sess-1", "google-sub-1", 120, now);
    recordSessionPing("sess-1", "google-sub-1", 60, now + 60_000);
    recordSessionPing("sess-1", "google-sub-1", 0, now + 120_000, true);
    recordSessionPing("sess-1", "google-sub-1", 0, now + 130_000, true);

    recordSessionPing("sess-guest", null, 30, now);
    recordSessionPing("sess-guest", null, 0, now + 30_000, true);

    const s = getUsageStatsSummary(now + 120_000);
    expect(s.oauthUsers.total).toBe(1);
    expect(s.logins.today).toBe(2);
    expect(s.videos.today).toBe(2);
    expect(s.videos.guestLast30Days).toBe(1);
    expect(s.screenTime.sessionsLast30Days).toBe(2);
    expect(s.screenTime.avgSessionSecondsLast30).toBe(105);

    const logFile = path.join(logsDir, "peketube-2026-06-26.log");
    expect(fs.existsSync(logFile)).toBe(true);
    const logText = fs.readFileSync(logFile, "utf8");
    expect(logText).toContain("Google login (cuenta nueva)");
    expect(logText).toContain("a@test.com");
    expect(logText).toContain("Google login user=google");
    expect(logText).toContain("Sesión iniciada session=sess-1 user=google-sub-1");
    expect(logText).toContain(
      "Sesión cerrada session=sess-1 user=google-sub-1 duración=180s",
    );
    expect(logText).toContain("Sesión iniciada session=sess-guest invitado");
    expect(logText).toContain("Sesión cerrada session=sess-guest invitado duración=30s");

    const sessionStartCount = (logText.match(/Sesión iniciada session=sess-1/g) ?? [])
      .length;
    const sessionEndCount = (logText.match(/Sesión cerrada session=sess-1/g) ?? [])
      .length;
    expect(sessionStartCount).toBe(1);
    expect(sessionEndCount).toBe(1);

    process.env.PEKETUBE_SERVER_DB_PATH = prevDb;
    process.env.PEKETUBE_LOG_DIR = prevLog;
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
