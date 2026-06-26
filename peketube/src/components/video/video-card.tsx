"use client";

import Image from "next/image";
import Link from "next/link";
import type { VideoDTO } from "@/lib/yt/types";
import {
  formatDuration,
  formatPublishedRelative,
  formatViewCount,
} from "@/lib/yt/format-display";

type VideoCardProps = {
  video: VideoDTO;
  /** Barra de progreso estilo YouTube (historial local, OQ-05-004). */
  historyProgress?: { progressSec: number; durationSec: number };
};

export function VideoCard({ video, historyProgress }: VideoCardProps) {
  const href = `/watch/${encodeURIComponent(video.id)}`;
  const duration = formatDuration(video.durationSec);
  const views = formatViewCount(video.viewCount);
  const when = formatPublishedRelative(video.publishedAt);
  const showHistoryBar =
    historyProgress &&
    historyProgress.durationSec > 0 &&
    historyProgress.progressSec >= 0;
  const historyPct = showHistoryBar
    ? Math.min(
        100,
        (historyProgress.progressSec / historyProgress.durationSec) * 100,
      )
    : 0;

  return (
    <Link href={href} className="block w-full min-w-0">
      <div className="relative aspect-video w-full overflow-hidden rounded-none bg-muted sm:rounded-xl lg:rounded-xl">
        {video.thumbnailUrl ? (
          <Image
            src={video.thumbnailUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 20vw"
          />
        ) : null}
        {showHistoryBar ? (
          <div
            className="absolute bottom-0 left-0 right-0 h-1 bg-black/40"
            aria-hidden
          >
            <div
              className="h-full bg-[#ff0000]"
              style={{ width: `${historyPct}%` }}
            />
          </div>
        ) : null}
        {duration ? (
          <span
            className={`absolute right-1 rounded bg-black/80 px-1 py-0.5 text-xs font-medium text-white ${
              showHistoryBar ? "bottom-2" : "bottom-1"
            }`}
          >
            {duration}
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex gap-3 px-1 pb-3 sm:px-0 lg:pb-2">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
            {video.title}
          </h3>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {video.channelTitle}
            {views ? ` · ${views}` : ""}
            {when ? ` · ${when}` : ""}
          </p>
        </div>
      </div>
    </Link>
  );
}
