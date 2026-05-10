"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Share2, ThumbsUp } from "lucide-react";
import { RelatedList } from "@/components/player/related-list";
import { VideoCommentsPanel } from "@/components/player/video-comments-panel";
import { WatchNotAvailable } from "@/components/player/watch-not-available";
import { YouTubePlayer } from "@/components/player/youtube-player";
import { Button } from "@/components/ui/button";
import { useBlacklist } from "@/components/providers/blacklist-provider";
import { useKidstubeSettings } from "@/hooks/use-kidstube-settings";
import { recordWatch, updateProgress } from "@/lib/db/history";
import { applyBlacklist, isVideoBlacklisted } from "@/lib/yt/filter";
import {
  formatPublishedRelative,
  formatViewCount,
} from "@/lib/yt/format-display";
import { useRelated, useVideo, useVideoComments } from "@/lib/yt/swr";

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

  const commentsEnabled = settings.showVideoComments;
  const comments = useVideoComments(videoId, commentsEnabled);

  const [descOpen, setDescOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [keywordDraft, setKeywordDraft] = useState("");

  const hasRecordedRef = useRef(false);
  const lastSecRef = useRef(0);
  useEffect(() => {
    hasRecordedRef.current = false;
    lastSecRef.current = 0;
  }, [videoId]);

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
    if (!settings.autoPlayNext) return;
    const next = relatedIdsRef.current.find((id) => id !== videoId);
    if (next) router.push(`/watch/${encodeURIComponent(next)}`);
  }, [
    video,
    settings.autoPlayNext,
    settings.historyRecordMode,
    router,
    videoId,
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
      <YouTubePlayer
        videoId={video.id}
        onEnded={handleEnded}
        onStateChange={handleStateChange}
        onProgress={handleProgress}
      />

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
          <Button type="button" variant="secondary" size="sm" disabled>
            <Share2 className="mr-1 h-4 w-4" />
            Compartir
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBlockOpen(true)}
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

      {blockOpen ? (
        <div
          role="presentation"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setBlockOpen(false)}
        >
          <div
            role="dialog"
            className="max-w-sm rounded-lg border border-border bg-background p-4 text-left shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium">Lista negra parental</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Elige qué bloquear. Los listados de la app filtrarán estos elementos
              (y se sincronizan en el servidor si iniciaste sesión).
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => {
                  void blockVideo(video.id);
                  setBlockOpen(false);
                  router.push("/");
                }}
              >
                Bloquear este vídeo
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => {
                  void blockChannel(video.channelId);
                  setBlockOpen(false);
                  router.push("/");
                }}
              >
                Bloquear canal ({video.channelTitle})
              </Button>
            </div>
            <label className="mt-4 block text-xs font-medium text-muted-foreground">
              Palabra en títulos (no distingue mayúsculas)
              <input
                type="text"
                value={keywordDraft}
                onChange={(e) => setKeywordDraft(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground"
                placeholder="ej. nombre de marca"
              />
            </label>
            <Button
              type="button"
              variant="outline"
              className="mt-2 w-full"
              onClick={() => {
                const t = keywordDraft.trim();
                if (!t) return;
                void blockTitleKeyword(t);
                setKeywordDraft("");
                setBlockOpen(false);
              }}
            >
              Bloquear palabra en títulos
            </Button>
            <Button
              type="button"
              className="mt-4 w-full"
              onClick={() => setBlockOpen(false)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
