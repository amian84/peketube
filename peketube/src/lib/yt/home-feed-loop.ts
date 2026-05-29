import type { VideoDTO } from "@/lib/yt/types";

/** Tamaño de cada “página” mock al reutilizar vídeos ya cargados (como scroll real). */
export const LOOP_MOCK_BATCH = 10;
export const HOME_LOOP_SNAPSHOT_SIZE = 16;

export type HomeFeedScrollItem = VideoDTO & { loopPass?: number };

export function toHomeDisplayItems(
  popular: VideoDTO[],
  history: VideoDTO[],
  scroll: HomeFeedScrollItem[],
): HomeFeedScrollItem[] {
  return [...popular, ...history, ...scroll];
}

export function captureHomeLoopSnapshot(
  popular: VideoDTO[],
  history: VideoDTO[],
): VideoDTO[] {
  return buildLoopPool(popular, history, []).slice(0, HOME_LOOP_SNAPSHOT_SIZE);
}

/** Pool único en orden de visualización (sin loopPass). */
export function buildLoopPool(
  popular: VideoDTO[],
  history: VideoDTO[],
  scroll: HomeFeedScrollItem[],
): VideoDTO[] {
  const seen = new Set<string>();
  const pool: VideoDTO[] = [];
  for (const v of [...popular, ...history, ...scroll]) {
    if (seen.has(v.id)) continue;
    seen.add(v.id);
    const { loopPass: _lp, ...base } = v;
    pool.push(base);
  }
  return pool;
}

export function homeFeedTotal(
  popular: number,
  history: number,
  scroll: number,
): number {
  return popular + history + scroll;
}

/** Siguiente “página” de 10 del pool (cursor avanza en bucle). */
export function takeMockScrollPage(
  pool: VideoDTO[],
  cursor: number,
): { page: VideoDTO[]; nextCursor: number } {
  if (pool.length === 0) return { page: [], nextCursor: 0 };
  const page: VideoDTO[] = [];
  for (let i = 0; i < LOOP_MOCK_BATCH; i++) {
    page.push(pool[(cursor + i) % pool.length]!);
  }
  return {
    page,
    nextCursor: (cursor + LOOP_MOCK_BATCH) % pool.length,
  };
}

/**
 * Igual que añadir una página de API: append abajo + recortar por arriba si > max.
 */
export function appendScrollDedupeOrRepeat(
  popular: VideoDTO[],
  history: VideoDTO[],
  scroll: HomeFeedScrollItem[],
  incoming: VideoDTO[],
  loopPass: number,
): { scroll: HomeFeedScrollItem[]; added: number; repeated: boolean } {
  const seen = new Set<string>();
  for (const v of popular) seen.add(v.id);
  for (const v of history) seen.add(v.id);
  for (const v of scroll) seen.add(v.id);

  const unique: HomeFeedScrollItem[] = [];
  for (const v of incoming) {
    if (seen.has(v.id)) continue;
    seen.add(v.id);
    unique.push(v);
  }
  if (unique.length > 0) {
    return {
      scroll: [...scroll, ...unique],
      added: unique.length,
      repeated: false,
    };
  }
  if (incoming.length === 0) {
    return { scroll, added: 0, repeated: false };
  }
  const batch = incoming.map((v) => ({ ...v, loopPass }));
  return {
    scroll: [...scroll, ...batch],
    added: batch.length,
    repeated: true,
  };
}

/**
 * Reutiliza vídeos del pool: 10 abajo, sin tope en DOM (el max es solo cuándo
 * dejar de llamar a YouTube, no cuántas tarjetas se muestran).
 */
export function appendMockPageLikeApi(
  popular: VideoDTO[],
  history: VideoDTO[],
  scroll: HomeFeedScrollItem[],
  page: VideoDTO[],
  loopPass: number,
): {
  popular: VideoDTO[];
  history: VideoDTO[];
  scroll: HomeFeedScrollItem[];
  added: number;
  repeated: boolean;
} | null {
  if (page.length === 0) return null;

  const batch: HomeFeedScrollItem[] = page.map((v) => ({ ...v, loopPass }));
  return {
    popular,
    history,
    scroll: [...scroll, ...batch],
    added: batch.length,
    repeated: true,
  };
}
