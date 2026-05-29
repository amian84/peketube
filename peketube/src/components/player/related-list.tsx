"use client";

import { VideoCard } from "@/components/video/video-card";
import type { VideoDTO } from "@/lib/yt/types";

type RelatedListProps = {
  videos: VideoDTO[];
  title?: string;
};

export function RelatedList({
  videos,
  title = "Siguientes",
}: RelatedListProps) {
  if (videos.length === 0) return null;

  return (
    <section className="mt-8 border-t border-border px-2 pb-8 pt-4 sm:px-0">
      <h2 className="mb-3 px-1 text-base font-semibold">{title}</h2>
      <div className="flex flex-col gap-0 sm:gap-2">
        {videos.map((v) => (
          <VideoCard key={v.id} video={v} />
        ))}
      </div>
    </section>
  );
}
