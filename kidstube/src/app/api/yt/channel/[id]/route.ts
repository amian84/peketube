import { NextResponse } from "next/server";
import { mapChannelResource } from "@/lib/yt/mappers";
import { isQuotaExceeded, youtubeGet } from "@/lib/yt/server-youtube";

export async function GET(
  _req: Request,
  ctx: { params: { id: string } },
) {
  try {
    const { id } = ctx.params;
    if (!id) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    const { ok, status, json } = await youtubeGet("channels", {
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
