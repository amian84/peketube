import { NextResponse } from "next/server";
import { appendLogLine } from "@/lib/logging/file-logger";

/** Compatibilidad: delega en el fichero rotativo. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { tag?: string; data?: unknown };
    const tag = body.tag ?? "client";
    const payload =
      body.data !== undefined ? JSON.stringify(body.data) : "(sin data)";
    appendLogLine("CLIENT", tag, payload);
  } catch {
    appendLogLine("CLIENT", "client", "(body inválido)");
  }
  return NextResponse.json({ ok: true });
}
