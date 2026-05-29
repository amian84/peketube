import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import {
  clearUserWatchHistory,
  clampRetentionDays,
  listUserWatchHistory,
  updateUserWatchProgress,
  upsertUserWatchHistory,
} from "@/lib/watch-history/server-store";
import type { WatchHistoryWire } from "@/lib/watch-history/types";
import type { VideoDTO } from "@/lib/yt/types";

function parseRetentionDays(req: NextRequest, body?: unknown): number {
  const fromQuery = req.nextUrl.searchParams.get("retentionDays");
  if (fromQuery !== null) {
    const n = Number(fromQuery);
    if (Number.isFinite(n)) return clampRetentionDays(n);
  }
  if (body && typeof body === "object") {
    const rd = (body as Record<string, unknown>).retentionDays;
    if (typeof rd === "number" && Number.isFinite(rd)) {
      return clampRetentionDays(rd);
    }
  }
  return clampRetentionDays(undefined);
}

function parseUpsertBody(body: unknown): {
  row: WatchHistoryWire;
  retentionDays: number;
} | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const rd = (body as Record<string, unknown>).retentionDays;
  const retentionDays =
    typeof rd === "number" && Number.isFinite(rd)
      ? clampRetentionDays(rd)
      : clampRetentionDays(undefined);

  const video = o.video as VideoDTO | undefined;
  if (video && typeof video.id === "string") {
    const progressSec =
      typeof o.progressSec === "number" ? Math.floor(o.progressSec) : 0;
    return {
      retentionDays,
      row: {
        videoId: video.id,
        title: video.title ?? "",
        channelId: video.channelId ?? "",
        channelTitle: video.channelTitle ?? "",
        thumbnailUrl: video.thumbnailUrl ?? "",
        durationSec: video.durationSec,
        watchedAt: Date.now(),
        progressSec: Math.max(0, progressSec),
      },
    };
  }

  const videoId = typeof o.videoId === "string" ? o.videoId : null;
  if (!videoId) return null;
  return {
    retentionDays,
    row: {
      videoId,
      title: typeof o.title === "string" ? o.title : "",
      channelId: typeof o.channelId === "string" ? o.channelId : "",
      channelTitle: typeof o.channelTitle === "string" ? o.channelTitle : "",
      thumbnailUrl: typeof o.thumbnailUrl === "string" ? o.thumbnailUrl : "",
      durationSec:
        typeof o.durationSec === "number" ? o.durationSec : undefined,
      watchedAt:
        typeof o.watchedAt === "number" ? Math.floor(o.watchedAt) : Date.now(),
      progressSec:
        typeof o.progressSec === "number"
          ? Math.max(0, Math.floor(o.progressSec))
          : 0,
    },
  };
}

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "100");
  const offset = Number(req.nextUrl.searchParams.get("offset") ?? "0");
  const retentionDays = parseRetentionDays(req);
  const items = listUserWatchHistory(userId, {
    limit: Number.isFinite(limit) ? limit : 100,
    offset: Number.isFinite(offset) ? offset : 0,
    retentionDays,
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const parsed = parseUpsertBody(body);
  if (!parsed) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const row = upsertUserWatchHistory(
    userId,
    parsed.row,
    parsed.retentionDays,
  );
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const videoId = typeof o.videoId === "string" ? o.videoId : null;
  const progressSec =
    typeof o.progressSec === "number" ? o.progressSec : null;
  if (!videoId || progressSec === null) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const retentionDays = parseRetentionDays(req, body);
  const row = updateUserWatchProgress(
    userId,
    videoId,
    progressSec,
    retentionDays,
  );
  if (!row) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }
  clearUserWatchHistory(userId);
  return NextResponse.json({ ok: true });
}
