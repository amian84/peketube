import { DEFAULT_VIDEO_GRID_DESIRED } from "@/lib/yt/fill-filtered-page";
import type { VideoDTO } from "@/lib/yt/types";

/** Proporción de vídeos ligados al historial en el home (resto = descubrimiento genérico). */
export const HOME_FEED_HISTORY_SHARE = 0.65;

export function homeFeedHistoryBudget(
  total: number = DEFAULT_VIDEO_GRID_DESIRED,
): number {
  return Math.round(total * HOME_FEED_HISTORY_SHARE);
}

export function homeFeedGenericBudget(
  total: number = DEFAULT_VIDEO_GRID_DESIRED,
): number {
  return Math.max(0, total - homeFeedHistoryBudget(total));
}

/**
 * Mezcla dos listas manteniendo ~65% historial / 35% genérico en el orden visual.
 */
export function interleaveHistoryAndGeneric(
  history: VideoDTO[],
  generic: VideoDTO[],
  historyShare: number = HOME_FEED_HISTORY_SHARE,
): VideoDTO[] {
  const out: VideoDTO[] = [];
  let hi = 0;
  let gi = 0;
  let histPlaced = 0;
  let genPlaced = 0;

  while (hi < history.length || gi < generic.length) {
    const placed = histPlaced + genPlaced;
    const pickHistory =
      hi < history.length &&
      (gi >= generic.length ||
        histPlaced / Math.max(1, placed + 1) < historyShare);

    if (pickHistory) {
      out.push(history[hi]!);
      hi += 1;
      histPlaced += 1;
    } else if (gi < generic.length) {
      out.push(generic[gi]!);
      gi += 1;
      genPlaced += 1;
    } else {
      out.push(history[hi]!);
      hi += 1;
      histPlaced += 1;
    }
  }

  return out;
}

/** Reparte una lista mezclada en popular + cola (orden conservado). */
export function splitBlendedFeed(
  merged: VideoDTO[],
  popularCount: number,
): { popular: VideoDTO[]; tail: VideoDTO[] } {
  const splitAt = Math.min(Math.max(1, popularCount), merged.length);
  return {
    popular: merged.slice(0, splitAt),
    tail: merged.slice(splitAt),
  };
}
