import type { VideoDTO } from "@/lib/yt/types";

/** Orden: popular primero, cola al final; recorta desde el final hasta ≤ max. */
export function trimPopularPlusTail(
  popular: VideoDTO[],
  tail: VideoDTO[],
  max: number,
): { popular: VideoDTO[]; tail: VideoDTO[] } {
  let p = [...popular];
  let t = [...tail];
  while (p.length + t.length > max) {
    if (t.length > 0) t = t.slice(0, -1);
    else p = p.slice(0, -1);
  }
  return { popular: p, tail: t };
}

export function trimVideoList(items: VideoDTO[], max: number): VideoDTO[] {
  return items.length <= max ? items : items.slice(0, max);
}

/**
 * Home: popular → historial → scroll (nuevos abajo).
 * Si hay demasiados, quita por la cabeza para no borrar lo recién cargado al fondo.
 */
export function trimHomeFeedSections(
  popular: VideoDTO[],
  history: VideoDTO[],
  scroll: VideoDTO[],
  max: number,
): { popular: VideoDTO[]; history: VideoDTO[]; scroll: VideoDTO[] } {
  let p = [...popular];
  let h = [...history];
  let s = [...scroll];
  while (p.length + h.length + s.length > max) {
    if (p.length > 0) p = p.slice(1);
    else if (h.length > 0) h = h.slice(1);
    else if (s.length > 0) s = s.slice(1);
  }
  return { popular: p, history: h, scroll: s };
}
