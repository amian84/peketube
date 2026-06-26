import path from "path";

const LOG_FILE_PREFIX = "peketube-";
const LOG_FILE_SUFFIX = ".log";

export function isFileLoggingEnabled(): boolean {
  return process.env.PEKETUBE_LOG_DISABLED?.trim().toLowerCase() !== "true";
}

export function logRetentionDays(): number {
  const raw = Number(process.env.PEKETUBE_LOG_RETENTION_DAYS ?? "7");
  if (!Number.isFinite(raw) || raw < 1) return 7;
  return Math.min(Math.floor(raw), 90);
}

export function logDirectory(): string {
  const fromEnv = process.env.PEKETUBE_LOG_DIR?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.PEKETUBE_SERVER_DB_PATH?.trim()) {
    return path.join(path.dirname(process.env.PEKETUBE_SERVER_DB_PATH.trim()), "logs");
  }
  return path.join(process.cwd(), "data", "logs");
}

export function logFileNameForDate(dateKey: string): string {
  return `${LOG_FILE_PREFIX}${dateKey}${LOG_FILE_SUFFIX}`;
}

export function logFilePathForDate(dateKey: string): string {
  return path.join(logDirectory(), logFileNameForDate(dateKey));
}

export function parseLogDateKey(fileName: string): string | null {
  if (!fileName.startsWith(LOG_FILE_PREFIX) || !fileName.endsWith(LOG_FILE_SUFFIX)) {
    return null;
  }
  const key = fileName.slice(LOG_FILE_PREFIX.length, -LOG_FILE_SUFFIX.length);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
}

export function todayDateKey(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
