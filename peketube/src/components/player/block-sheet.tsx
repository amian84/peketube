"use client";

import { Button } from "@/components/ui/button";
import type { VideoDTO } from "@/lib/yt/types";

export type BlockSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: Pick<VideoDTO, "id" | "channelId" | "channelTitle">;
  keywordDraft: string;
  onKeywordDraftChange: (v: string) => void;
  onPickBlockVideo: () => void;
  onPickBlockChannel: () => void;
  onPickBlockKeyword: () => void;
};

/**
 * Bottom sheet (móvil) / diálogo centrado (desktop) para elegir qué bloquear.
 * El PIN se confirma en `PinDialog` (prompt 08).
 */
export function BlockSheet({
  open,
  onOpenChange,
  video,
  keywordDraft,
  onKeywordDraftChange,
  onPickBlockVideo,
  onPickBlockChannel,
  onPickBlockKeyword,
}: BlockSheetProps) {
  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="block-sheet-title"
        className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-t-xl border border-border bg-background p-4 shadow-lg sm:max-h-none sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="block-sheet-title" className="text-sm font-medium">
          Lista negra parental
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Elige qué bloquear. Los listados filtrarán estos elementos (y se
          sincronizan en el servidor si iniciaste sesión). Se pedirá el PIN para
          confirmar.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              onPickBlockVideo();
            }}
          >
            Bloquear este vídeo
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              onPickBlockChannel();
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
            onChange={(e) => onKeywordDraftChange(e.target.value)}
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
            onOpenChange(false);
            onPickBlockKeyword();
          }}
        >
          Bloquear palabra en títulos
        </Button>
        <Button
          type="button"
          className="mt-4 w-full"
          onClick={() => onOpenChange(false)}
        >
          Cerrar
        </Button>
      </div>
    </div>
  );
}
