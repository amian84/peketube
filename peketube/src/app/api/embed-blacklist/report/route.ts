import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  addEmbedBlocked,
  isEmbedAutoMarkEnabled,
} from "@/lib/embed-blacklist/sqlite-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Ingesta pública (mismo origen, sin Basic Auth): el reproductor reporta un
 * vídeo que falló por bloqueo del propietario fuera de YouTube. Si el
 * auto-marcado está activo, se añade a la blacklist global de embed.
 */
export async function POST(req: NextRequest) {
  let body: {
    videoId?: unknown;
    title?: unknown;
    channelId?: unknown;
    channelTitle?: unknown;
    thumbnailUrl?: unknown;
    reason?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const videoId = typeof body.videoId === "string" ? body.videoId.trim() : "";
  if (!videoId) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  if (!isEmbedAutoMarkEnabled()) {
    return NextResponse.json({ ok: true, marked: false });
  }

  const asStr = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  try {
    addEmbedBlocked({
      videoId,
      title: asStr(body.title),
      channelId: asStr(body.channelId),
      channelTitle: asStr(body.channelTitle),
      thumbnailUrl: asStr(body.thumbnailUrl),
      reason: asStr(body.reason) ?? "embed_blocked",
      source: "auto",
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true, marked: true });
}
