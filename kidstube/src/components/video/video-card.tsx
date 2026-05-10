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
};

export function VideoCard({ video }: VideoCardProps) {
  const href = `/watch/${encodeURIComponent(video.id)}`;
  const duration = formatDuration(video.durationSec);
  const views = formatViewCount(video.viewCount);
  const when = formatPublishedRelative(video.publishedAt);

  return (
    <Link href={href} className="block w-full min-w-0">
      <div className="relative aspect-video w-full overflow-hidden rounded-none bg-muted sm:rounded-xl">
        {video.thumbnailUrl ? (
          <Image
            src={video.thumbnailUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : null}
        {duration ? (
          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-xs font-medium text-white">
            {duration}
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex gap-3 px-1 pb-4 sm:px-0">
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
