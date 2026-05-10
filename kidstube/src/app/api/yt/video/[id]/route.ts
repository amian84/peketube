import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getYouTubeAccessToken } from "@/lib/auth/youtube-token";
import { mapVideoResource } from "@/lib/yt/mappers";
import { isQuotaExceeded, youtubeGetBearer } from "@/lib/yt/server-youtube";
import { parseStrictKids } from "@/lib/yt/validate-request";

export async function GET(
  req: NextRequest,
  ctx: { params: { id: string } },
) {
  try {
    const accessToken = await getYouTubeAccessToken(req);
    if (!accessToken) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }

    const { id } = ctx.params;
    if (!id) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const strictKids = parseStrictKids(searchParams);

    const { ok, status, json } = await youtubeGetBearer(accessToken, "videos", {
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
    throw e;
  }
}
