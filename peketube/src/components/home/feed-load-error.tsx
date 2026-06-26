import { Button } from "@/components/ui/button";

type FeedLoadErrorProps = {
  message: string;
  onRetry: () => void;
};

export function FeedLoadError({ message, onRetry }: FeedLoadErrorProps) {
  return (
    <div className="mx-2 flex flex-col items-center gap-4 rounded-lg border border-[var(--yt-border)] bg-[var(--yt-surface)] px-4 py-10 text-center">
      <p className="max-w-sm text-sm text-[var(--yt-text-secondary)]">{message}</p>
      <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
