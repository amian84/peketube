"use client";

import Image from "next/image";
import Link from "next/link";
import type { VideoDTO } from "@/lib/yt/types";
import { formatDuration } from "@/lib/yt/format-display";

type ShortCardProps = {
  video: VideoDTO;
};

export function ShortCard({ video }: ShortCardProps) {
  const href = `/watch/${encodeURIComponent(video.id)}`;
  const duration = formatDuration(video.durationSec);

  return (
    <Link
      href={href}
      className="flex w-[42vw] max-w-[160px] shrink-0 flex-col gap-2 sm:w-36"
    >
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg bg-muted">
        {video.thumbnailUrl ? (
          <Image
            src={video.thumbnailUrl}
            alt=""
            fill
            className="object-cover"
            sizes="160px"
          />
        ) : null}
        {duration ? (
          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium text-white">
            {duration}
          </span>
        ) : null}
      </div>
      <h3 className="line-clamp-2 text-xs font-medium leading-tight text-foreground">
        {video.title}
      </h3>
    </Link>
  );
}
