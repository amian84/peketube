import "server-only";

import fs from "fs";
import path from "path";
import {
  isFileLoggingEnabled,
  logDirectory,
  logFilePathForDate,
  logRetentionDays,
  parseLogDateKey,
  todayDateKey,
} from "@/lib/logging/config";

let pruneScheduled = false;

function ensureLogDir(): string | null {
  if (!isFileLoggingEnabled()) return null;
  const dir = logDirectory();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function formatArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === "string") return a;
      if (a instanceof Error) return a.stack ?? a.message;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(" ");
}

export function appendLogLine(
  level: "INFO" | "WARN" | "ERROR" | "CLIENT",
  tag: string,
  message: string,
  now = new Date(),
): void {
  const dir = ensureLogDir();
  if (!dir) return;

  const dateKey = todayDateKey(now);
  const line = `${now.toISOString()} [${level}] [${tag}] ${message}\n`;
  const file = logFilePathForDate(dateKey);
  try {
    fs.appendFileSync(file, line, "utf8");
    schedulePrune();
  } catch (e) {
    process.stderr.write(
      `[peketube-log] append failed: ${e instanceof Error ? e.message : String(e)}\n`,
    );
  }
}

export function appendLogArgs(
  level: "INFO" | "WARN" | "ERROR",
  args: unknown[],
): void {
  const tag = typeof args[0] === "string" ? args[0] : "server";
  const rest = typeof args[0] === "string" ? args.slice(1) : args;
  appendLogLine(level, tag, formatArgs(rest));
}

function schedulePrune(): void {
  if (pruneScheduled) return;
  pruneScheduled = true;
  setImmediate(() => {
    pruneScheduled = false;
    try {
      pruneOldLogFiles();
    } catch {
      /* ignore */
    }
  });
}

export function pruneOldLogFiles(now = new Date()): void {
  const dir = ensureLogDir();
  if (!dir) return;

  const retention = logRetentionDays();
  const cutoff = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  cutoff.setUTCDate(cutoff.getUTCDate() - retention);

  for (const name of fs.readdirSync(dir)) {
    const dateKey = parseLogDateKey(name);
    if (!dateKey) continue;
    const [y, m, d] = dateKey.split("-").map(Number);
    const fileDate = new Date(Date.UTC(y!, m! - 1, d!));
    if (fileDate < cutoff) {
      try {
        fs.unlinkSync(path.join(dir, name));
      } catch {
        /* ignore */
      }
    }
  }
}

export function listLogDates(): string[] {
  const dir = ensureLogDir();
  if (!dir) return [];
  const dates: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    const key = parseLogDateKey(name);
    if (key) dates.push(key);
  }
  dates.sort((a, b) => b.localeCompare(a));
  return dates;
}

export function readLogFile(
  dateKey: string,
  options?: { tail?: number; q?: string },
): { lines: string[]; truncated: boolean; totalLines: number } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return { lines: [], truncated: false, totalLines: 0 };
  }
  const file = logFilePathForDate(dateKey);
  if (!fs.existsSync(file)) {
    return { lines: [], truncated: false, totalLines: 0 };
  }

  const raw = fs.readFileSync(file, "utf8");
  let lines = raw.split("\n").filter((l) => l.length > 0);

  const q = options?.q?.trim().toLowerCase();
  if (q) {
    lines = lines.filter((l) => l.toLowerCase().includes(q));
  }

  const totalLines = lines.length;
  const tail = options?.tail;
  let truncated = false;
  if (tail != null && Number.isFinite(tail) && tail > 0 && lines.length > tail) {
    lines = lines.slice(-tail);
    truncated = true;
  }

  return { lines, truncated, totalLines };
}
