import { NextResponse } from "next/server";
import { mapVideoResource } from "@/lib/yt/mappers";
import { isQuotaExceeded, youtubeGet } from "@/lib/yt/server-youtube";
import { parseStrictKids } from "@/lib/yt/validate-request";

export async function GET(
  req: Request,
  ctx: { params: { id: string } },
) {
  try {
    const { id } = ctx.params;
    if (!id) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const strictKids = parseStrictKids(searchParams);

    const { ok, status, json } = await youtubeGet("videos", {
      part: "snippet,contentDetails,statistics,status",
      id,
    });

    if (!ok || !json.items?.[0]) {
      const statusOut = isQuotaExceeded(json) ? 429 : status;
      return NextResponse.json(
        {
          error: "YOUTUBE_API_ERROR",
          message: json.error?.message,
          quotaExceeded: isQuotaExceeded(json),
        },
        { status: statusOut },
      );
    }

    const video = mapVideoResource(
      json.items[0] as Parameters<typeof mapVideoResource>[0],
    );

    if (strictKids && video.madeForKids !== true) {
      return NextResponse.json(
        {
          error: "NOT_MADE_FOR_KIDS",
          message: "Vídeo no disponible en modo solo contenido infantil",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(video);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("YOUTUBE_API_KEY")) {
      return NextResponse.json(
        { error: "SERVER_CONFIG", message: msg },
        { status: 500 },
      );
    }
    throw e;
  }
}
