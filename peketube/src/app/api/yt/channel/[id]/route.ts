import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { mapChannelResource } from "@/lib/yt/mappers";
import {
  guestUnavailableResponse,
  resolveYoutubeAccess,
  youtubeErrorResponse,
  youtubeGet,
} from "@/lib/yt/youtube-access";

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

  const { ok, status, json } = await youtubeGet(access, "channels", {
    part: "snippet,statistics,contentDetails,brandingSettings",
    id,
  });

  if (!ok || !json.items?.[0]) {
    return youtubeErrorResponse(access, status, json);
  }

  const channel = mapChannelResource(
    json.items[0] as Parameters<typeof mapChannelResource>[0],
  );
  return NextResponse.json(channel);
}
