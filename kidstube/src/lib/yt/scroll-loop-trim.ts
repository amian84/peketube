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
