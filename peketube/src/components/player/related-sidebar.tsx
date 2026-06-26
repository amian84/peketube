"use client";

import { RelatedVideoRow } from "@/components/video/related-video-row";
import type { VideoDTO } from "@/lib/yt/types";

type RelatedSidebarProps = {
  videos: VideoDTO[];
  title?: string;
};

export function RelatedSidebar({
  videos,
  title = "Siguientes",
}: RelatedSidebarProps) {
  if (videos.length === 0) return null;

  return (
    <aside
      className="hidden lg:block lg:shrink-0 lg:w-[402px]"
      aria-label={title}
    >
      <div className="sticky top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto py-4 pl-2 pr-4">
        <h2 className="mb-2 px-1 text-base font-semibold">{title}</h2>
        <div className="flex flex-col gap-1">
          {videos.map((v) => (
            <RelatedVideoRow key={v.id} video={v} />
          ))}
        </div>
      </div>
    </aside>
  );
}
