"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Share2, ThumbsUp } from "lucide-react";
import { RelatedList } from "@/components/player/related-list";
import { VideoCommentsPanel } from "@/components/player/video-comments-panel";
import { WatchNotAvailable } from "@/components/player/watch-not-available";
import { YouTubePlayer } from "@/components/player/youtube-player";
import { Button } from "@/components/ui/button";
import { useKidstubeSettings } from "@/hooks/use-kidstube-settings";
import {
  formatPublishedRelative,
  formatViewCount,
} from "@/lib/yt/format-display";
import { useRelated, useVideo, useVideoComments } from "@/lib/yt/swr";

type WatchPageClientProps = {
  videoId: string;
};

export function WatchPageClient({ videoId }: WatchPageClientProps) {
  const router = useRouter();
  const settings = useKidstubeSettings();
  const { data, error, isLoading } = useVideo(videoId);
  const video = data?.data;

  const related = useRelated(
    video?.id ?? null,
    video?.title ?? null,
    video?.channelId ?? null,
  );
  const relatedVideos = related.data?.data?.items ?? [];
  const relatedIdsRef = useRef<string[]>([]);
  relatedIdsRef.current = relatedVideos.map((v) => v.id);

  const commentsEnabled = settings.showVideoComments;
  const comments = useVideoComments(videoId, commentsEnabled);

  const [descOpen, setDescOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  const blocked =
    !!video &&
    settings.strictKidsOnly &&
    video.madeForKids !== true;

  const handleEnded = useCallback(() => {
    if (!settings.autoPlayNext) return;
    const next = relatedIdsRef.current.find((id) => id !== videoId);
    if (next) router.push(`/watch/${encodeURIComponent(next)}`);
  }, [settings.autoPlayNext, router, videoId]);

  const handleProgress = useCallback((sec: number) => {
    void sec; /* prompt 05 — historial */
  }, []);

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

  const views = formatViewCount(video.viewCount);
  const when = formatPublishedRelative(video.publishedAt);

  return (
    <main className="pb-24">
      <YouTubePlayer
        videoId={video.id}
        onEnded={handleEnded}
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

      <RelatedList videos={relatedVideos} />

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
            <p className="text-sm font-medium">Bloquear vídeo o canal</p>
            <p className="mt-2 text-sm text-muted-foreground">
              La acción real (y el PIN) llegará en el prompt 08. Por ahora solo
              es un aviso.
            </p>
            <Button
              type="button"
              className="mt-4 w-full"
              onClick={() => setBlockOpen(false)}
            >
              Entendido
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
