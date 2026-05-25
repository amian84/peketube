import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { mapVideoResource } from "@/lib/yt/mappers";
import {
  guestUnavailableResponse,
  resolveYoutubeAccess,
  youtubeErrorResponse,
  youtubeGet,
} from "@/lib/yt/youtube-access";
import { parseStrictKids } from "@/lib/yt/validate-request";

export async function GET(
  req: NextRequest,
  ctx: { params: { id: string } },
) {
  const access = await resolveYoutubeAccess(req);
  if (!access) {
    return guestUnavailableResponse();
  }

  const { id } = ctx.params;
  if (!id) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const strictKids = parseStrictKids(searchParams);

  const { ok, status, json } = await youtubeGet(access, "videos", {
    part: "snippet,contentDetails,statistics,status",
    id,
  });

  if (!ok || !json.items?.[0]) {
    return youtubeErrorResponse(access, status, json);
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
}
