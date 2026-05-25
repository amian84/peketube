"use client";

import Image from "next/image";
import Link from "next/link";
import type { VideoDTO } from "@/lib/yt/types";

type Props = {
  videos: VideoDTO[];
  onReplay?: () => void;
};

/** Cubre la pantalla final de YouTube y ofrece siguientes vídeos en KidsTube. */
export function PlayerEndOverlay({ videos, onReplay }: Props) {
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col bg-[#0f0f0f]/98 p-4 backdrop-blur-sm"
      role="dialog"
      aria-label="Siguientes en KidsTube"
    >
      <p className="mb-3 text-sm font-semibold text-white">Siguiente en KidsTube</p>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {videos.slice(0, 6).map((v) => (
          <li key={v.id}>
            <Link
              href={`/watch/${encodeURIComponent(v.id)}`}
              className="flex gap-3 rounded-lg bg-[#272727] p-2 hover:bg-[#3f3f3f]"
            >
              {v.thumbnailUrl ? (
                <Image
                  src={v.thumbnailUrl}
                  alt=""
                  width={120}
                  height={68}
                  className="h-[68px] w-[120px] shrink-0 rounded object-cover"
                />
              ) : (
                <div className="h-[68px] w-[120px] shrink-0 rounded bg-muted" />
              )}
              <span className="line-clamp-2 text-sm text-white">{v.title}</span>
            </Link>
          </li>
        ))}
      </ul>
      {onReplay ? (
        <button
          type="button"
          onClick={onReplay}
          className="mt-3 shrink-0 rounded-lg border border-[#3f3f3f] px-4 py-2 text-sm text-[#f1f1f1] hover:bg-[#272727]"
        >
          Ver de nuevo
        </button>
      ) : null}
    </div>
  );
}
