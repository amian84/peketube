"use client";

import { useEffect, useRef } from "react";
import { ensureYoutubeIframeApi } from "@/lib/player/youtube-iframe-api";

/** YT.PlayerState.ENDED en IFrame API */
const PS_ENDED = 0;

type YTPlayerLike = {
  destroy: () => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
};

type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayerLike;
};

export type YouTubePlayerProps = {
  videoId: string;
  onEnded?: () => void;
  onStateChange?: (state: number) => void;
  onProgress?: (seconds: number) => void;
};

export function YouTubePlayer({
  videoId,
  onEnded,
  onStateChange,
  onProgress,
}: YouTubePlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerLike | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onEndedRef = useRef(onEnded);
  const onStateChangeRef = useRef(onStateChange);
  const onProgressRef = useRef(onProgress);
  onEndedRef.current = onEnded;
  onStateChangeRef.current = onStateChange;
  onProgressRef.current = onProgress;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;

    (async () => {
      try {
        await ensureYoutubeIframeApi();
      } catch {
        return;
      }
      if (cancelled || !hostRef.current) return;

      const YT = (window as unknown as { YT: YTNamespace }).YT;
      if (!YT?.Player) return;

      playerRef.current?.destroy();
      playerRef.current = null;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }

      host.innerHTML = "";

      const origin =
        typeof window !== "undefined" ? window.location.origin : "";

      const player = new YT.Player(host, {
        videoId,
        playerVars: {
          playsinline: 1,
          modestbranding: 1,
          rel: 0,
          enablejsapi: 1,
          origin,
        },
        events: {
          onReady: () => {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = setInterval(() => {
              try {
                const t = player.getCurrentTime();
                onProgressRef.current?.(t);
              } catch {
                /* player disposed */
              }
            }, 10_000);
          },
          onStateChange: (e) => {
            onStateChangeRef.current?.(e.data);
            if (e.data === PS_ENDED) {
              onEndedRef.current?.();
            }
          },
        },
      });

      playerRef.current = player;
    })();

    return () => {
      cancelled = true;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      try {
        playerRef.current?.destroy();
      } catch {
        /* noop */
      }
      playerRef.current = null;
    };
  }, [videoId]);

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-black">
      <div ref={hostRef} className="h-full w-full" />
    </div>
  );
}
