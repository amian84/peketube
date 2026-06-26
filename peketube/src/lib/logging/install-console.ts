import "server-only";

import { appendLogArgs, appendLogLine } from "@/lib/logging/file-logger";

let installed = false;

function hookProcessErrors(): void {
  process.on("uncaughtException", (err) => {
    appendLogLine("ERROR", "process", formatErr(err));
  });
  process.on("unhandledRejection", (reason) => {
    appendLogLine("ERROR", "unhandledRejection", formatErr(reason));
  });
}

function formatErr(err: unknown): string {
  if (err instanceof Error) return err.stack ?? err.message;
  return String(err);
}

export function installConsoleFileLogger(): void {
  if (installed) return;
  installed = true;

  const origLog = console.log.bind(console);
  const origInfo = console.info.bind(console);
  const origWarn = console.warn.bind(console);
  const origError = console.error.bind(console);

  console.log = (...args: unknown[]) => {
    origLog(...args);
    appendLogArgs("INFO", args);
  };
  console.info = (...args: unknown[]) => {
    origInfo(...args);
    appendLogArgs("INFO", args);
  };
  console.warn = (...args: unknown[]) => {
    origWarn(...args);
    appendLogArgs("WARN", args);
  };
  console.error = (...args: unknown[]) => {
    origError(...args);
    appendLogArgs("ERROR", args);
  };

  hookProcessErrors();
}
