/** @vitest-environment node */

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  logDirectory,
  logFileNameForDate,
  parseLogDateKey,
  todayDateKey,
} from "@/lib/logging/config";
import {
  appendLogLine,
  pruneOldLogFiles,
  readLogFile,
  resetLogDirCacheForTests,
} from "@/lib/logging/file-logger";
import fs from "fs";
import os from "os";
import path from "path";

describe("logging config", () => {
  it("formatea nombre de fichero por fecha", () => {
    expect(logFileNameForDate("2026-06-26")).toBe("peketube-2026-06-26.log");
    expect(parseLogDateKey("peketube-2026-06-26.log")).toBe("2026-06-26");
    expect(parseLogDateKey("other.log")).toBeNull();
  });

  it("todayDateKey usa UTC", () => {
    expect(todayDateKey(new Date("2026-06-26T23:00:00.000Z"))).toBe("2026-06-26");
  });

  it("logDirectory en producción sin env usa /data/logs", () => {
    const prevDir = process.env.PEKETUBE_LOG_DIR;
    const prevDb = process.env.PEKETUBE_SERVER_DB_PATH;
    delete process.env.PEKETUBE_LOG_DIR;
    delete process.env.PEKETUBE_SERVER_DB_PATH;
    vi.stubEnv("NODE_ENV", "production");
    try {
      expect(logDirectory()).toBe("/data/logs");
    } finally {
      vi.unstubAllEnvs();
      process.env.PEKETUBE_LOG_DIR = prevDir;
      process.env.PEKETUBE_SERVER_DB_PATH = prevDb;
    }
  });

  it("logDirectory deriva logs del directorio del SQLite", () => {
    const prevDir = process.env.PEKETUBE_LOG_DIR;
    const prevDb = process.env.PEKETUBE_SERVER_DB_PATH;
    delete process.env.PEKETUBE_LOG_DIR;
    process.env.PEKETUBE_SERVER_DB_PATH = "/data/peketube.sqlite";
    expect(logDirectory()).toBe("/data/logs");
    process.env.PEKETUBE_LOG_DIR = prevDir;
    process.env.PEKETUBE_SERVER_DB_PATH = prevDb;
  });
});

describe("file-logger", () => {
  it("prune elimina ficheros más antiguos que retención", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "peketube-log-"));
    const prev = process.env.PEKETUBE_LOG_DIR;
    const prevDisabled = process.env.PEKETUBE_LOG_DISABLED;
    const prevRetention = process.env.PEKETUBE_LOG_RETENTION_DAYS;
    process.env.PEKETUBE_LOG_DIR = dir;
    process.env.PEKETUBE_LOG_DISABLED = "false";
    process.env.PEKETUBE_LOG_RETENTION_DAYS = "7";

    fs.writeFileSync(path.join(dir, "peketube-2020-01-01.log"), "old\n");
    fs.writeFileSync(path.join(dir, "peketube-2026-06-26.log"), "new\n");

    pruneOldLogFiles(new Date("2026-06-26T12:00:00.000Z"));

    expect(fs.existsSync(path.join(dir, "peketube-2020-01-01.log"))).toBe(false);
    expect(fs.existsSync(path.join(dir, "peketube-2026-06-26.log"))).toBe(true);

    process.env.PEKETUBE_LOG_DIR = prev;
    process.env.PEKETUBE_LOG_DISABLED = prevDisabled;
    process.env.PEKETUBE_LOG_RETENTION_DAYS = prevRetention;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("readLogFile filtra y hace tail", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "peketube-log-"));
    const prev = process.env.PEKETUBE_LOG_DIR;
    process.env.PEKETUBE_LOG_DIR = dir;
    fs.writeFileSync(
      path.join(dir, "peketube-2026-06-26.log"),
      "alpha\nbeta\nParentalPin gamma\n",
    );

    const filtered = readLogFile("2026-06-26", { q: "parentalpin" });
    expect(filtered.lines).toHaveLength(1);
    expect(filtered.lines[0]).toContain("gamma");

    const tail = readLogFile("2026-06-26", { tail: 2 });
    expect(tail.lines).toEqual(["beta", "ParentalPin gamma"]);
    expect(tail.truncated).toBe(true);

    process.env.PEKETUBE_LOG_DIR = prev;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("appendLogLine no lanza si mkdir falla", () => {
    const prevDir = process.env.PEKETUBE_LOG_DIR;
    const prevDisabled = process.env.PEKETUBE_LOG_DISABLED;
    process.env.PEKETUBE_LOG_DIR = "/root/no-write-peketube-test";
    process.env.PEKETUBE_LOG_DISABLED = "false";
    resetLogDirCacheForTests();
    const mkdirSpy = vi.spyOn(fs, "mkdirSync").mockImplementation(() => {
      const err = new Error("EACCES") as NodeJS.ErrnoException;
      err.code = "EACCES";
      throw err;
    });
    expect(() => appendLogLine("INFO", "test", "hello")).not.toThrow();
    expect(() => appendLogLine("INFO", "test", "again")).not.toThrow();
    mkdirSpy.mockRestore();
    resetLogDirCacheForTests();
    process.env.PEKETUBE_LOG_DIR = prevDir;
    process.env.PEKETUBE_LOG_DISABLED = prevDisabled;
  });
});
