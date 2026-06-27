import { NextResponse } from "next/server";
import { isFileLoggingEnabled } from "@/lib/logging/config";
import { appendLogLine } from "@/lib/logging/file-logger";

export async function POST(req: Request) {
  if (!isFileLoggingEnabled()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const body = (await req.json()) as { tag?: string; data?: unknown };
    const tag = body.tag?.trim() || "client";
    const payload =
      body.data !== undefined ? JSON.stringify(body.data) : "(sin data)";
    appendLogLine("CLIENT", tag, payload);
  } catch {
    appendLogLine("CLIENT", "client", "(body inválido)");
  }

  return NextResponse.json({ ok: true });
}
