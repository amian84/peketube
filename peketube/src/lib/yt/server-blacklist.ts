import "server-only";

import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { getUserBlacklistRow } from "@/lib/blacklist/sqlite-store";
import {
  getEmbedBlockedChannelIdSet,
  getEmbedBlockedIdSet,
} from "@/lib/embed-blacklist/sqlite-store";
import {
  emptyBlacklistSnapshot,
  snapshotFromWire,
  type BlacklistSnapshot,
} from "@/lib/yt/filter";

/**
 * Snapshot de blacklist para filtrar en el servidor antes de devolver vídeos.
 * Combina:
 *  - Blacklist personal del usuario autenticado (SQLite). Invitados sin sesión
 *    no aportan blacklist personal (la suya es local y se aplica en cliente).
 *  - Blacklist global de embed bloqueado (a nivel de app, aplica a todos),
 *    que se rellena al detectar vídeos no reproducibles fuera de YouTube.
 */
export async function loadServerBlacklistSnapshot(
  req: NextRequest,
): Promise<BlacklistSnapshot> {
  const userId = await getSessionUserId(req);
  let snapshot: BlacklistSnapshot;
  if (userId) {
    try {
      snapshot = snapshotFromWire(getUserBlacklistRow(userId));
    } catch {
      snapshot = emptyBlacklistSnapshot();
    }
  } else {
    snapshot = emptyBlacklistSnapshot();
  }

  try {
    for (const id of Array.from(getEmbedBlockedIdSet())) snapshot.videos.add(id);
    for (const id of Array.from(getEmbedBlockedChannelIdSet())) {
      snapshot.channels.add(id);
    }
  } catch {
    // Si el store global falla, seguimos con la blacklist personal.
  }
  return snapshot;
}
