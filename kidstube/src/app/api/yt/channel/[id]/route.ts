import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getYouTubeAccessToken } from "@/lib/auth/youtube-token";
import { mapChannelResource } from "@/lib/yt/mappers";
import { isQuotaExceeded, youtubeGetBearer } from "@/lib/yt/server-youtube";

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

    const { ok, status, json } = await youtubeGetBearer(accessToken, "channels", {
      part: "snippet,statistics",
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

    const channel = mapChannelResource(
      json.items[0] as Parameters<typeof mapChannelResource>[0],
    );
    return NextResponse.json(channel);
  } catch (e) {
    throw e;
  }
}
