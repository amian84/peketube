"use client";

/** Endurecimiento del embed — límites: `peketube/docs/embed-limits.md` (OQ-11-003 A). */

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { ensureYoutubeIframeApi } from "@/lib/player/youtube-iframe-api";
import {
  formatPlayerTime,
  isYoutubeEmbedBlockedError,
} from "@/lib/player/format-time";
import { Button } from "@/components/ui/button";

const PS_ENDED = 0;
const PS_PLAYING = 1;
const PS_BUFFERING = 3;

const PROGRESS_POLL_MS = 250;
const HISTORY_PROGRESS_MS = 10_000;
const SEEK_STEP_SEC = 10;
/** Retraso para no pausar al hacer doble clic (seek ±10 s). */
const PLAY_CLICK_DELAY_MS = 280;
const SEEK_HINT_MS = 650;

type YTPlayerLike = {
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
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
        onError?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayerLike;
};

export type YouTubePlayerProps = {
  videoId: string;
  onEnded?: () => void;
  onStateChange?: (state: number) => void;
  onProgress?: (seconds: number) => void;
  /** 101/150 etc. — vídeo no embebible en sitios externos */
  onEmbedError?: (code: number) => void;
};

/**
 * Reproductor acotado: iframe sin clics, barra de progreso y seeking propios.
 */
export function YouTubePlayer({
  videoId,
  onEnded,
  onStateChange,
  onProgress,
  onEmbedError,
}: YouTubePlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerLike | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seekingRef = useRef(false);
  const lastHistoryAtRef = useRef(0);
  const playClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [seekHint, setSeekHint] = useState<"-10" | "+10" | null>(null);

  const onEndedRef = useRef(onEnded);
  const onStateChangeRef = useRef(onStateChange);
  const onProgressRef = useRef(onProgress);
  const onEmbedErrorRef = useRef(onEmbedError);
  onEndedRef.current = onEnded;
  onStateChangeRef.current = onStateChange;
  onProgressRef.current = onProgress;
  onEmbedErrorRef.current = onEmbedError;

  const syncPlaying = useCallback((state: number) => {
    setPlaying(state === PS_PLAYING || state === PS_BUFFERING);
  }, []);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      const s = p.getPlayerState();
      if (s === PS_PLAYING || s === PS_BUFFERING) p.pauseVideo();
      else p.playVideo();
    } catch {
      /* disposed */
    }
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const p = playerRef.current;
    if (!p || durationSec <= 0) return;
    const t = Math.min(Math.max(0, seconds), durationSec);
    try {
      p.seekTo(t, true);
      setCurrentSec(t);
    } catch {
      /* disposed */
    }
  }, [durationSec]);

  const showSeekHint = useCallback((hint: "-10" | "+10") => {
    setSeekHint(hint);
    if (seekHintTimerRef.current) clearTimeout(seekHintTimerRef.current);
    seekHintTimerRef.current = setTimeout(() => setSeekHint(null), SEEK_HINT_MS);
  }, []);

  const seekByDelta = useCallback(
    (delta: number) => {
      if (!ready || durationSec <= 0) return;
      const p = playerRef.current;
      let t = currentSec;
      try {
        if (p) t = p.getCurrentTime();
      } catch {
        /* disposed */
      }
      seekTo(t + delta);
      showSeekHint(delta > 0 ? "+10" : "-10");
    },
    [ready, durationSec, currentSec, seekTo, showSeekHint],
  );

  const cancelPlayToggle = useCallback(() => {
    if (playClickTimerRef.current) {
      clearTimeout(playClickTimerRef.current);
      playClickTimerRef.current = null;
    }
  }, []);

  const schedulePlayToggle = useCallback(() => {
    cancelPlayToggle();
    playClickTimerRef.current = setTimeout(() => {
      playClickTimerRef.current = null;
      togglePlay();
    }, PLAY_CLICK_DELAY_MS);
  }, [cancelPlayToggle, togglePlay]);

  const onZoneDoubleClick = useCallback(
    (delta: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      cancelPlayToggle();
      seekByDelta(delta);
    },
    [cancelPlayToggle, seekByDelta],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    setReady(false);
    setPlaying(false);
    setCurrentSec(0);
    setDurationSec(0);
    lastHistoryAtRef.current = 0;

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
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          iv_load_policy: 3,
          enablejsapi: 1,
          origin,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            setReady(true);
            try {
              const d = player.getDuration();
              if (d > 0) setDurationSec(d);
            } catch {
              /* noop */
            }
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = setInterval(() => {
              try {
                const now = Date.now();
                if (!seekingRef.current) {
                  const t = player.getCurrentTime();
                  setCurrentSec(t);
                  const d = player.getDuration();
                  if (d > 0) setDurationSec(d);
                }
                if (now - lastHistoryAtRef.current >= HISTORY_PROGRESS_MS) {
                  lastHistoryAtRef.current = now;
                  onProgressRef.current?.(player.getCurrentTime());
                }
              } catch {
                /* disposed */
              }
            }, PROGRESS_POLL_MS);
          },
          onStateChange: (e) => {
            syncPlaying(e.data);
            onStateChangeRef.current?.(e.data);
            if (e.data === PS_ENDED) {
              onEndedRef.current?.();
            }
          },
          onError: (e) => {
            if (isYoutubeEmbedBlockedError(e.data)) {
              onEmbedErrorRef.current?.(e.data);
            }
          },
        },
      });

      playerRef.current = player;
    })();

    return () => {
      cancelled = true;
      setReady(false);
      cancelPlayToggle();
      if (seekHintTimerRef.current) {
        clearTimeout(seekHintTimerRef.current);
        seekHintTimerRef.current = null;
      }
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
  }, [videoId, syncPlaying, cancelPlayToggle]);

  const progressPct =
    durationSec > 0 ? Math.min(100, (currentSec / durationSec) * 100) : 0;

  return (
    <div className="overflow-hidden rounded-t-lg bg-black">
      <div className="relative aspect-video w-full">
        <div
          ref={hostRef}
          className="kids-yt-embed pointer-events-none h-full w-full [&_iframe]:pointer-events-none"
        />
        {ready ? (
          <div
            className="absolute inset-0 z-10 flex"
            onContextMenu={(e) => e.preventDefault()}
          >
            <button
              type="button"
              className="h-full w-[42%] cursor-pointer border-0 bg-transparent p-0"
              aria-label="Doble clic: retroceder 10 segundos. Un clic: pausar o reproducir"
              onClick={schedulePlayToggle}
              onDoubleClick={(e) => onZoneDoubleClick(-SEEK_STEP_SEC, e)}
            />
            <button
              type="button"
              className="h-full min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0"
              aria-label={playing ? "Pausar vídeo" : "Reproducir vídeo"}
              onClick={schedulePlayToggle}
              onDoubleClick={(e) => {
                e.preventDefault();
                cancelPlayToggle();
              }}
            />
            <button
              type="button"
              className="h-full w-[42%] cursor-pointer border-0 bg-transparent p-0"
              aria-label="Doble clic: adelantar 10 segundos. Un clic: pausar o reproducir"
              onClick={schedulePlayToggle}
              onDoubleClick={(e) => onZoneDoubleClick(SEEK_STEP_SEC, e)}
            />
            {seekHint ? (
              <div
                className="pointer-events-none absolute inset-y-0 flex w-[42%] items-center justify-center bg-black/25"
                style={{
                  left: seekHint === "-10" ? 0 : undefined,
                  right: seekHint === "+10" ? 0 : undefined,
                }}
                aria-live="polite"
              >
                <span className="rounded bg-black/70 px-3 py-1.5 text-lg font-semibold text-white">
                  {seekHint === "-10" ? "−10 s" : "+10 s"}
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
            <span className="text-sm text-white/80">Cargando…</span>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-[#272727] bg-[#0f0f0f] px-3 py-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!ready}
            onClick={togglePlay}
            aria-label={playing ? "Pausar" : "Reproducir"}
            className="shrink-0"
          >
            {playing ? (
              <Pause className="h-4 w-4" aria-hidden />
            ) : (
              <Play className="h-4 w-4" aria-hidden />
            )}
          </Button>
          <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-[#aaa]">
            {formatPlayerTime(currentSec)}
          </span>
          <input
            type="range"
            min={0}
            max={durationSec > 0 ? durationSec : 1}
            step={1}
            value={durationSec > 0 ? Math.min(currentSec, durationSec) : 0}
            disabled={!ready || durationSec <= 0}
            aria-label="Posición del vídeo"
            className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[#ff0000] disabled:opacity-40"
            style={{
              background: `linear-gradient(to right, #ff0000 ${progressPct}%, #3f3f3f ${progressPct}%)`,
            }}
            onPointerDown={() => {
              seekingRef.current = true;
            }}
            onPointerUp={() => {
              seekingRef.current = false;
            }}
            onInput={(e) => {
              const v = Number(e.currentTarget.value);
              setCurrentSec(v);
              seekTo(v);
            }}
          />
          <span className="w-10 shrink-0 text-[11px] tabular-nums text-[#aaa]">
            {formatPlayerTime(durationSec)}
          </span>
        </div>
        <p className="text-[10px] leading-tight text-[#888]">
          Doble clic izquierda/derecha: ±10 s · Un clic: play/pausa · Barra: buscar
          posición
        </p>
      </div>
    </div>
  );
}
