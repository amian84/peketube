"use client";

import Image from "next/image";
import Link from "next/link";
import type { VideoDTO } from "@/lib/yt/types";
import {
  formatDuration,
  formatPublishedRelative,
  formatViewCount,
} from "@/lib/yt/format-display";

type RelatedVideoRowProps = {
  video: VideoDTO;
};

/** Fila compacta estilo barra lateral de YouTube en escritorio. */
export function RelatedVideoRow({ video }: RelatedVideoRowProps) {
  const href = `/watch/${encodeURIComponent(video.id)}`;
  const duration = formatDuration(video.durationSec);
  const views = formatViewCount(video.viewCount);
  const when = formatPublishedRelative(video.publishedAt);

  return (
    <Link
      href={href}
      className="flex gap-2 rounded-lg py-1 hover:bg-[var(--yt-chip-bg)]"
    >
      <div className="relative aspect-video w-[168px] shrink-0 overflow-hidden rounded-lg bg-muted">
        {video.thumbnailUrl ? (
          <Image
            src={video.thumbnailUrl}
            alt=""
            fill
            className="object-cover"
            sizes="168px"
          />
        ) : null}
        {duration ? (
          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium text-white">
            {duration}
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
          {video.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {video.channelTitle}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {views ? views : null}
          {views && when ? " · " : null}
          {when ? when : null}
        </p>
      </div>
    </Link>
  );
}
