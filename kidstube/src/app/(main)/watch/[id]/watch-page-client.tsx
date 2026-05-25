"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Share2, ThumbsUp } from "lucide-react";
import { RelatedList } from "@/components/player/related-list";
import { VideoCommentsPanel } from "@/components/player/video-comments-panel";
import { WatchNotAvailable } from "@/components/player/watch-not-available";
import { PlayerEndOverlay } from "@/components/player/player-end-overlay";
import { YouTubePlayer } from "@/components/player/youtube-player";
import { BlockSheet } from "@/components/player/block-sheet";
import { Button } from "@/components/ui/button";
import { PinDialog } from "@/components/parental/pin-dialog";
import { useBlacklist } from "@/components/providers/blacklist-provider";
import { useKidstubeSettings } from "@/hooks/use-kidstube-settings";
import { recordWatch, updateProgress } from "@/lib/db/history";
import { navigateAfterWatchBlock } from "@/lib/parental/navigate-after-watch-block";
import { applyBlacklist, isVideoBlacklisted } from "@/lib/yt/filter";
import {
  formatPublishedRelative,
  formatViewCount,
} from "@/lib/yt/format-display";
import { useRelated, useVideo, useVideoComments } from "@/lib/yt/swr";

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
  const settings = useKidstubeSettings();
  const { data, error, isLoading } = useVideo(videoId);
  const video = data?.data;

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

  const relatedItems = useMemo(
    () => related.data?.data?.items ?? [],
    [related.data],
  );

  useEffect(() => {
    if (!toastMsg) return;
    const id = window.setTimeout(() => setToastMsg(null), 2400);
    return () => window.clearTimeout(id);
  }, [toastMsg]);

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
    if (
      !goToNextVideo("Este vídeo no se puede ver aquí; pasando al siguiente…")
    ) {
      setToastMsg("Este vídeo no se puede reproducir en KidsTube.");
    }
  }, [goToNextVideo]);

  const copyKidsTubeLink = useCallback(async () => {
    if (!video) return;
    const url = `${window.location.origin}/watch/${encodeURIComponent(video.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      setToastMsg("Enlace de KidsTube copiado");
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

  if (isLoading && !video) {
    return (
      <main className="px-2 pb-24 pt-2 sm:px-3">
        <div className="aspect-video w-full animate-pulse rounded-lg bg-muted" />
        <p className="mt-4 text-sm text-muted-foreground">Cargando vídeo…</p>
      </main>
    );
  }

  if (error || !video) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 pb-24">
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
    <main className="pb-24">
      <div className="relative">
        <YouTubePlayer
          key={`${video.id}-${playerKey}`}
          videoId={video.id}
          onEnded={handleEnded}
          onStateChange={handleStateChange}
          onProgress={handleProgress}
          onEmbedError={handleEmbedError}
        />
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
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#0f0f0f]/98 p-4">
              <p className="text-sm font-medium text-white">Fin del vídeo</p>
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

      <div className="px-3 py-3 sm:px-4">
        <h1 className="text-base font-semibold leading-snug sm:text-lg">
          {video.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {video.channelTitle}
          {views ? ` · ${views}` : ""}
          {when ? ` · ${when}` : ""}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" disabled>
            <ThumbsUp className="mr-1 h-4 w-4" />
            Me gusta
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void copyKidsTubeLink()}
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

        {video.description ? (
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
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {video.description}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <RelatedList videos={relatedVideosFiltered} />

      {commentsEnabled ? (
        <VideoCommentsPanel
          items={commentItems}
          loading={comments.isLoading}
          error={!!comments.error}
        />
      ) : null}

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
