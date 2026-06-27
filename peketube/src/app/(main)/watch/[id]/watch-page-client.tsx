"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Share2, ThumbsUp } from "lucide-react";
import { RelatedList } from "@/components/player/related-list";
import { RelatedSidebar } from "@/components/player/related-sidebar";
import { VideoCommentsPanel } from "@/components/player/video-comments-panel";
import { WatchNotAvailable } from "@/components/player/watch-not-available";
import { PlayerEndOverlay } from "@/components/player/player-end-overlay";
import { FeedLoadError } from "@/components/home/feed-load-error";
import { YouTubePlayer } from "@/components/player/youtube-player";
import { BlockSheet } from "@/components/player/block-sheet";
import { Button } from "@/components/ui/button";
import { PinDialog } from "@/components/parental/pin-dialog";
import { useBlacklist } from "@/components/providers/blacklist-provider";
import { usePeketubeSettings } from "@/hooks/use-peketube-settings";
import { isVideoLiked, toggleVideoLike } from "@/lib/db/likes";
import { recordWatch, updateProgress } from "@/lib/db/history";
import { sanitizeVideoDescription } from "@/lib/yt/sanitize-description";
import { navigateAfterWatchBlock } from "@/lib/parental/navigate-after-watch-block";
import { applyBlacklist, isVideoBlacklisted } from "@/lib/yt/filter";
import {
  formatPublishedRelative,
  formatSubscriberCount,
  formatViewCount,
} from "@/lib/yt/format-display";
import {
  useChannel,
  useRelated,
  useVideo,
  useVideoComments,
} from "@/lib/yt/swr";
import Image from "next/image";
import { MAIN_BOTTOM_PAD } from "@/lib/layout/responsive";
import { LOAD_TIMEOUT_MESSAGE, secToMs } from "@/lib/loading/timeouts";
import { reportVideoPlayStat } from "@/lib/stats/client";

/** Tras confirmar PIN (prompt 08). */
type PendingBlock =
  | { type: "video" }
  | { type: "channel" }
  | { type: "keyword"; phrase: string };

/** YT.PlayerState.PLAYING (IFrame API) */
const PS_PLAYING = 1;

type WatchPageClientProps = {
  videoId: string;
};

export function WatchPageClient({ videoId }: WatchPageClientProps) {
  const router = useRouter();
  const settings = usePeketubeSettings();
  const { data, error, isLoading, mutate } = useVideo(videoId);
  const video = data?.data;
  const [metaTimedOut, setMetaTimedOut] = useState(false);

  const {
    snapshot,
    blockVideo,
    blockChannel,
    blockTitleKeyword,
  } = useBlacklist();

  const related = useRelated(
    video?.id ?? null,
    video?.title ?? null,
    video?.channelId ?? null,
  );
  const relatedVideosFiltered = useMemo(() => {
    const items = related.data?.data?.items ?? [];
    return applyBlacklist(items, snapshot);
  }, [related.data, snapshot]);
  const relatedIdsRef = useRef<string[]>([]);
  relatedIdsRef.current = relatedVideosFiltered.map((v) => v.id);
  const embedSkipRef = useRef(false);

  const channelInfo = useChannel(video?.channelId ?? null);
  const channel = channelInfo.data?.data;
  const channelSubs = channel?.hiddenSubscriberCount
    ? ""
    : formatSubscriberCount(channel?.subscriberCount);

  const commentsEnabled = settings.showVideoComments;
  const comments = useVideoComments(videoId, commentsEnabled);

  const [descOpen, setDescOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pending, setPending] = useState<PendingBlock | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [keywordDraft, setKeywordDraft] = useState("");
  const [playerEnded, setPlayerEnded] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const [liked, setLiked] = useState(false);
  const [embedError, setEmbedError] = useState(false);

  useEffect(() => {
    let alive = true;
    void isVideoLiked(videoId).then((v) => {
      if (alive) setLiked(v);
    });
    return () => {
      alive = false;
    };
  }, [videoId]);

  const descriptionPlain = useMemo(
    () =>
      video?.description ? sanitizeVideoDescription(video.description) : "",
    [video?.description],
  );

  const relatedItems = useMemo(
    () => related.data?.data?.items ?? [],
    [related.data],
  );

  useEffect(() => {
    setMetaTimedOut(false);
  }, [videoId]);

  useEffect(() => {
    if (!isLoading || video) return;
    const id = window.setTimeout(() => {
      setMetaTimedOut(true);
    }, secToMs(settings.watchMetaTimeoutSec));
    return () => window.clearTimeout(id);
  }, [isLoading, video, videoId, settings.watchMetaTimeoutSec]);

  useEffect(() => {
    if (!toastMsg) return;
    const id = window.setTimeout(() => setToastMsg(null), 2400);
    return () => window.clearTimeout(id);
  }, [toastMsg]);

  const retryMetaLoad = useCallback(() => {
    setMetaTimedOut(false);
    void mutate();
  }, [mutate]);

  const handlePinOpenChange = useCallback((v: boolean) => {
    setPinOpen(v);
    if (!v) setPending(null);
  }, []);

  const afterPinVerified = useCallback(async () => {
    if (!video || !pending) return;
    if (pending.type === "video") await blockVideo(video.id);
    else if (pending.type === "channel") await blockChannel(video.channelId);
    else await blockTitleKeyword(pending.phrase);
    setKeywordDraft("");
    setToastMsg("Bloqueado.");
    const vidId = video.id;
    const items = relatedItems;
    await navigateAfterWatchBlock((href) => router.push(href), vidId, items);
  }, [
    video,
    pending,
    blockVideo,
    blockChannel,
    blockTitleKeyword,
    relatedItems,
    router,
  ]);

  const hasRecordedRef = useRef(false);
  const lastSecRef = useRef(0);
  useEffect(() => {
    hasRecordedRef.current = false;
    lastSecRef.current = 0;
    setPlayerEnded(false);
    setEmbedError(false);
    embedSkipRef.current = false;
  }, [videoId]);

  const goToNextVideo = useCallback(
    (toast?: string) => {
      const next = relatedIdsRef.current.find((id) => id !== videoId);
      if (next) {
        if (toast) setToastMsg(toast);
        router.push(`/watch/${encodeURIComponent(next)}`);
        return true;
      }
      return false;
    },
    [videoId, router],
  );

  const handleEmbedError = useCallback(() => {
    if (embedSkipRef.current) return;
    embedSkipRef.current = true;
    // Reporta a la blacklist global de embed (auto-marcado server-side, si está
    // activo) para que no se vuelva a pintar en feed/búsqueda/relacionados.
    if (video) {
      void fetch("/api/embed-blacklist/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        keepalive: true,
        body: JSON.stringify({
          videoId: video.id,
          title: video.title,
          channelId: video.channelId,
          channelTitle: video.channelTitle,
          thumbnailUrl: video.thumbnailUrl,
          reason: "embed_blocked",
        }),
      }).catch(() => {});
    }
    // Solo salta al siguiente si el autoplay está activado; si no, se queda
    // mostrando el error para que el adulto/niño sepa qué pasa.
    if (settings.autoPlayNext) {
      if (
        goToNextVideo("Este vídeo no se puede ver aquí; pasando al siguiente…")
      ) {
        return;
      }
    }
    setEmbedError(true);
  }, [goToNextVideo, settings.autoPlayNext, video]);

  const copyPekeTubeLink = useCallback(async () => {
    if (!video) return;
    const url = `${window.location.origin}/watch/${encodeURIComponent(video.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      setToastMsg("Enlace de PekeTube copiado");
    } catch {
      setToastMsg("No se pudo copiar el enlace");
    }
  }, [video]);

  const blocked =
    !!video &&
    settings.strictKidsOnly &&
    video.madeForKids !== true;

  const handleStateChange = useCallback(
    (state: number) => {
      if (!video) return;
      if (settings.historyRecordMode !== "on_play") return;
      if (state !== PS_PLAYING || hasRecordedRef.current) return;
      hasRecordedRef.current = true;
      reportVideoPlayStat(video.id, Math.floor(lastSecRef.current));
      void recordWatch(video, Math.floor(lastSecRef.current));
    },
    [video, settings.historyRecordMode],
  );

  const handleProgress = useCallback(
    (sec: number) => {
      lastSecRef.current = sec;
      if (!video) return;
      const mode = settings.historyRecordMode;
      if (mode === "after_10s" && sec >= 10 && !hasRecordedRef.current) {
        hasRecordedRef.current = true;
        void recordWatch(video, Math.floor(sec));
        return;
      }
      if (mode === "on_end") return;
      if (!hasRecordedRef.current) return;
      void updateProgress(video.id, sec);
    },
    [video, settings.historyRecordMode],
  );

  const handleEnded = useCallback(() => {
    if (
      video &&
      settings.historyRecordMode === "on_end" &&
      !hasRecordedRef.current
    ) {
      hasRecordedRef.current = true;
      void recordWatch(video, Math.floor(lastSecRef.current));
    }
    if (settings.autoPlayNext && goToNextVideo()) {
      return;
    }
    setPlayerEnded(true);
  }, [
    video,
    settings.autoPlayNext,
    settings.historyRecordMode,
    goToNextVideo,
  ]);

  const commentItems = comments.data?.data?.items ?? [];

  if (metaTimedOut && !video) {
    return (
      <main className={`px-2 pt-2 sm:px-3 ${MAIN_BOTTOM_PAD}`}>
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          <div className="flex h-full items-center justify-center p-4">
            <FeedLoadError
              message={LOAD_TIMEOUT_MESSAGE}
              onRetry={retryMetaLoad}
            />
          </div>
        </div>
      </main>
    );
  }

  if (isLoading && !video) {
    return (
      <main className={`px-2 pt-2 sm:px-3 ${MAIN_BOTTOM_PAD}`}>
        <div className="aspect-video w-full animate-pulse rounded-lg bg-[var(--yt-surface-elevated)]" />
        <div className="mt-4 flex justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--yt-border)] border-t-[#E62117]"
            role="status"
            aria-label="Cargando vídeo"
          />
        </div>
      </main>
    );
  }

  if (error || !video) {
    return (
      <main className={`flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 ${MAIN_BOTTOM_PAD}`}>
        <p className="text-sm text-destructive">No se pudo cargar el vídeo.</p>
        <Link
          href="/"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
        >
          Volver
        </Link>
      </main>
    );
  }

  if (blocked) {
    return <WatchNotAvailable />;
  }

  if (video && isVideoBlacklisted(video, snapshot)) {
    return (
      <WatchNotAvailable reason="Este vídeo está bloqueado por la lista negra parental (vídeo, canal o palabra en el título)." />
    );
  }

  const views = formatViewCount(video.viewCount);
  const when = formatPublishedRelative(video.publishedAt);

  return (
    <main className={MAIN_BOTTOM_PAD}>
      <div className="lg:flex lg:items-start lg:gap-6 lg:px-4 lg:pt-2">
        <div className="min-w-0 flex-1">
          <div className="relative lg:max-w-[1280px]">
            <YouTubePlayer
              key={`${video.id}-${playerKey}`}
              videoId={video.id}
              seekStepSec={settings.playerSeekStepSec}
              readyTimeoutSec={settings.playerReadyTimeoutSec}
              onEnded={handleEnded}
              onStateChange={handleStateChange}
              onProgress={handleProgress}
              onEmbedError={handleEmbedError}
            />
            {embedError ? (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[var(--yt-app-bg)]/98 p-4 text-center">
                <p className="text-sm font-medium text-foreground">
                  Este vídeo no se puede reproducir en PekeTube
                </p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  El propietario del contenido ha bloqueado su reproducción
                  fuera de YouTube.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEmbedError(false);
                      embedSkipRef.current = false;
                      setPlayerKey((k) => k + 1);
                    }}
                  >
                    Reintentar
                  </Button>
                  {relatedVideosFiltered.length > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setEmbedError(false);
                        goToNextVideo();
                      }}
                    >
                      Ver siguiente
                    </Button>
                  ) : null}
                  <Link
                    href="/"
                    className="text-sm text-primary underline-offset-2 hover:underline"
                  >
                    Volver al inicio
                  </Link>
                </div>
              </div>
            ) : null}
            {playerEnded ? (
              relatedVideosFiltered.length > 0 ? (
                <PlayerEndOverlay
                  videos={relatedVideosFiltered}
                  onReplay={() => {
                    setPlayerEnded(false);
                    setPlayerKey((k) => k + 1);
                  }}
                />
              ) : (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[var(--yt-app-bg)]/98 p-4">
                  <p className="text-sm font-medium text-foreground">
                    Fin del vídeo
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setPlayerEnded(false);
                      setPlayerKey((k) => k + 1);
                    }}
                  >
                    Ver de nuevo
                  </Button>
                  <Link
                    href="/"
                    className="text-sm text-primary underline-offset-2 hover:underline"
                  >
                    Volver al inicio
                  </Link>
                </div>
              )
            ) : null}
          </div>

          <div className="px-3 py-3 sm:px-4 lg:px-0">
            <h1 className="text-base font-semibold leading-snug sm:text-lg">
              {video.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {views ? views : ""}
              {views && when ? " · " : ""}
              {when ? when : ""}
            </p>

            <Link
              href={`/channel/${encodeURIComponent(video.channelId)}`}
              className="mt-3 flex items-center gap-3 rounded-lg p-1 transition-colors hover:bg-muted"
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                {channel?.thumbnailUrl ? (
                  <Image
                    src={channel.thumbnailUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {video.channelTitle}
                </p>
                {channelSubs ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {channelSubs}
                  </p>
                ) : null}
              </div>
            </Link>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant={liked ? "default" : "secondary"}
                size="sm"
                title="Guardado solo en este dispositivo (no en YouTube)"
                onClick={() => {
                  void toggleVideoLike(videoId).then(setLiked);
                }}
              >
                <ThumbsUp
                  className={`mr-1 h-4 w-4 ${liked ? "fill-current" : ""}`}
                />
                Me gusta
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void copyPekeTubeLink()}
              >
                <Share2 className="mr-1 h-4 w-4" />
                Compartir enlace
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSheetOpen(true)}
              >
                Bloquear
              </Button>
            </div>

            {descriptionPlain ? (
              <div className="mt-4 rounded-lg bg-muted/40 p-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left text-sm font-medium"
                  onClick={() => setDescOpen((o) => !o)}
                >
                  Descripción
                  {descOpen ? (
                    <ChevronUp className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  )}
                </button>
                {descOpen ? (
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {descriptionPlain}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="lg:hidden">
            <RelatedList videos={relatedVideosFiltered} />
          </div>

          {commentsEnabled ? (
            <VideoCommentsPanel
              items={commentItems}
              loading={comments.isLoading}
              error={!!comments.error}
            />
          ) : null}
        </div>

        <RelatedSidebar videos={relatedVideosFiltered} />
      </div>

      {toastMsg ? (
        <div
          role="status"
          className="fixed top-4 left-1/2 z-[120] max-w-[90vw] -translate-x-1/2 rounded-lg bg-foreground px-4 py-2 text-center text-sm text-background shadow-md"
        >
          {toastMsg}
        </div>
      ) : null}

      <BlockSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        video={video}
        keywordDraft={keywordDraft}
        onKeywordDraftChange={setKeywordDraft}
        onPickBlockVideo={() => {
          setPending({ type: "video" });
          setPinOpen(true);
        }}
        onPickBlockChannel={() => {
          setPending({ type: "channel" });
          setPinOpen(true);
        }}
        onPickBlockKeyword={() => {
          const t = keywordDraft.trim();
          if (!t) return;
          setPending({ type: "keyword", phrase: t });
          setPinOpen(true);
        }}
      />

      <PinDialog
        open={pinOpen}
        onOpenChange={handlePinOpenChange}
        onVerified={afterPinVerified}
        title="Confirmar bloqueo"
        description="Introduce el PIN parental de 4 dígitos."
      />
    </main>
  );
}
