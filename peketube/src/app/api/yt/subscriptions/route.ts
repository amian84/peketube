import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  authRequiredResponse,
  requireUserYoutubeAccess,
} from "@/lib/yt/youtube-access";

function bestThumb(t: Record<string, { url?: string }> | undefined) {
  if (!t) return "";
  return (
    t.high?.url ?? t.medium?.url ?? t.default?.url ?? ""
  );
}

export async function GET(req: NextRequest) {
  const access = await requireUserYoutubeAccess(req);
  if (!access) {
    return authRequiredResponse();
  }
  const accessToken = access.mode === "user" ? access.token : "";

  const { searchParams } = new URL(req.url);
  const pageToken = searchParams.get("pageToken") ?? undefined;

  const usp = new URLSearchParams({
    part: "snippet,contentDetails",
    mine: "true",
    maxResults: "24",
  });
  if (pageToken) usp.set("pageToken", pageToken);

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/subscriptions?${usp.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );
  const json = (await res.json()) as {
    error?: { message?: string };
    items?: {
      id?: string;
      snippet?: {
        title?: string;
        description?: string;
        resourceId?: { channelId?: string };
        thumbnails?: Record<string, { url?: string }>;
      };
    }[];
    nextPageToken?: string;
    prevPageToken?: string;
  };

  if (!res.ok) {
    return NextResponse.json(
      {
        error: "YOUTUBE_API_ERROR",
        message: json.error?.message ?? res.statusText,
      },
      { status: res.status },
    );
  }

  const items =
    json.items?.map((item) => ({
      subscriptionId: item.id ?? "",
      channelId: item.snippet?.resourceId?.channelId ?? "",
      title: item.snippet?.title ?? "",
      description: item.snippet?.description ?? "",
      thumbnailUrl: bestThumb(item.snippet?.thumbnails),
    })) ?? [];

  return NextResponse.json({
    items,
    nextPageToken: json.nextPageToken,
    prevPageToken: json.prevPageToken,
  });
}
