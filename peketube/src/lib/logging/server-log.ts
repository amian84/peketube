import "server-only";

import { appendLogLine } from "@/lib/logging/file-logger";

function formatError(err: unknown): string {
  if (err instanceof Error) return err.stack ?? err.message;
  return String(err);
}

/** Escribe en consola y en el fichero rotativo (`/logs`). */
export function logServerError(tag: string, err: unknown): void {
  const msg = formatError(err);
  console.error(`[${tag}]`, msg);
  appendLogLine("ERROR", tag, msg);
}

export function logServerInfo(tag: string, message: string): void {
  console.log(`[${tag}] ${message}`);
  appendLogLine("INFO", tag, message);
}
