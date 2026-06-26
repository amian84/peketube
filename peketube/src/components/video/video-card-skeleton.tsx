import { VIDEO_GRID_CLASS } from "@/lib/layout/responsive";

/** Placeholder gris de una tarjeta de vídeo (aspecto YouTube). */
export function VideoCardSkeleton() {
  return (
    <div className="block w-full min-w-0" aria-hidden>
      <div className="relative aspect-video w-full animate-pulse rounded-none bg-[var(--yt-surface-elevated)] sm:rounded-xl" />
      <div className="mt-2 space-y-2 px-2 sm:px-0">
        <div className="h-3.5 w-[92%] animate-pulse rounded bg-[var(--yt-surface-elevated)]" />
        <div className="h-3 w-[55%] animate-pulse rounded bg-[var(--yt-surface-elevated)]" />
      </div>
    </div>
  );
}

type HomeFeedSkeletonProps = {
  count?: number;
  showSpinner?: boolean;
};

export function HomeFeedSkeleton({
  count = 8,
  showSpinner = true,
}: HomeFeedSkeletonProps) {
  return (
    <div aria-busy="true" aria-label="Cargando vídeos">
      <div className={VIDEO_GRID_CLASS}>
        {Array.from({ length: count }, (_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
      {showSpinner ? (
        <div className="flex justify-center py-6" role="status">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--yt-border)] border-t-[#E62117]" />
          <span className="sr-only">Cargando…</span>
        </div>
      ) : null}
    </div>
  );
}
