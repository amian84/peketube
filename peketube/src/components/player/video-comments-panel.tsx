"use client";

import type { VideoCommentDTO } from "@/lib/yt/types";

type VideoCommentsPanelProps = {
  items: VideoCommentDTO[];
  loading?: boolean;
  error?: boolean;
};

export function VideoCommentsPanel({
  items,
  loading,
  error,
}: VideoCommentsPanelProps) {
  if (loading) {
    return (
      <section className="mt-6 border-t border-border px-2 py-4 sm:px-0">
        <h2 className="mb-2 text-base font-semibold">Comentarios</h2>
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-6 border-t border-border px-2 py-4 sm:px-0">
        <h2 className="mb-2 text-base font-semibold">Comentarios</h2>
        <p className="text-sm text-destructive">No se pudieron cargar.</p>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="mt-6 border-t border-border px-2 py-4 sm:px-0">
        <h2 className="mb-2 text-base font-semibold">Comentarios</h2>
        <p className="text-sm text-muted-foreground">Sin comentarios.</p>
      </section>
    );
  }

  return (
    <section className="mt-6 border-t border-border px-2 pb-8 pt-4 sm:px-0">
      <h2 className="mb-3 text-base font-semibold">Comentarios</h2>
      <ul className="space-y-4">
        {items.map((c) => (
          <li key={c.id} className="rounded-lg bg-muted/40 px-3 py-2">
            <p className="text-xs font-medium text-foreground">
              {c.authorDisplayName}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {c.text}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
