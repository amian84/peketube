import "server-only";

import {
  deleteParentalPinRow,
  getLatestLegacyParentalPinUserId,
  getParentalPinRow,
  getUserBlacklistRow,
  mergeUserBlacklistRow,
  replaceUserBlacklistRow,
  upsertParentalPinRow,
} from "@/lib/blacklist/sqlite-store";
import { isLegacyAuthJsUuid } from "@/lib/auth/oauth-user-id";
import { logServerInfo } from "@/lib/logging/server-log";
import { lookupOAuthUserIdsByEmail } from "@/lib/stats/store";
import { migrateWatchHistoryUserId } from "@/lib/watch-history/migrate-user-id";

function formatId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

function migrateParentalPin(fromId: string, toId: string, email?: string | null): boolean {
  if (fromId === toId) return false;
  const row = getParentalPinRow(fromId);
  if (!row || getParentalPinRow(toId)) return false;
  upsertParentalPinRow(toId, row, email);
  deleteParentalPinRow(fromId);
  return true;
}

function migrateBlacklist(fromId: string, toId: string): void {
  if (fromId === toId) return;
  const legacy = getUserBlacklistRow(fromId);
  const hasLegacy =
    legacy.channelIds.length > 0 ||
    legacy.videoIds.length > 0 ||
    legacy.titleKeywords.length > 0;
  if (!hasLegacy) return;
  const current = getUserBlacklistRow(toId);
  const currentEmpty =
    current.channelIds.length === 0 &&
    current.videoIds.length === 0 &&
    current.titleKeywords.length === 0;
  if (currentEmpty) {
    replaceUserBlacklistRow(toId, legacy);
  } else {
    mergeUserBlacklistRow(toId, legacy);
  }
  replaceUserBlacklistRow(fromId, {
    channelIds: [],
    videoIds: [],
    titleKeywords: [],
  });
}

/** Mueve PIN, blacklist e historial de un id efímero (UUID Auth.js) al `sub` de Google. */
export function migrateLegacyOAuthUserId(
  fromId: string,
  toId: string,
  email?: string | null,
): void {
  if (!isLegacyAuthJsUuid(fromId) || fromId === toId) return;
  const pinMoved = migrateParentalPin(fromId, toId, email);
  migrateBlacklist(fromId, toId);
  migrateWatchHistoryUserId(fromId, toId);
  if (pinMoved) {
    logServerInfo(
      "auth",
      `PIN migrado de UUID a Google sub: ${formatId(fromId)} → ${formatId(toId)} email=${email?.trim() ?? "(sin)"}`,
    );
  }
}

/**
 * Si el usuario ya tiene PIN bajo UUIDs viejos, enlázalo al `sub` estable.
 * No usa el correo como clave primaria (puede cambiar en Google); solo para encontrar filas huérfanas.
 */
export function ensureParentalPinMigratedToStableUser(
  stableUserId: string,
  email?: string | null,
): void {
  if (getParentalPinRow(stableUserId)) return;

  const legacyIds = new Set<string>();
  if (email?.trim()) {
    for (const id of lookupOAuthUserIdsByEmail(email)) {
      if (isLegacyAuthJsUuid(id) && id !== stableUserId) legacyIds.add(id);
    }
  }

  for (const legacyId of Array.from(legacyIds)) {
    if (migrateParentalPin(legacyId, stableUserId, email)) {
      migrateBlacklist(legacyId, stableUserId);
      migrateWatchHistoryUserId(legacyId, stableUserId);
      logServerInfo(
        "auth",
        `PIN recuperado por email: ${formatId(legacyId)} → ${formatId(stableUserId)}`,
      );
      return;
    }
  }

  const latestLegacy = getLatestLegacyParentalPinUserId();
  if (latestLegacy && latestLegacy !== stableUserId) {
    if (migrateParentalPin(latestLegacy, stableUserId, email)) {
      migrateBlacklist(latestLegacy, stableUserId);
      migrateWatchHistoryUserId(latestLegacy, stableUserId);
      logServerInfo(
        "auth",
        `PIN migrado (UUID más reciente): ${formatId(latestLegacy)} → ${formatId(stableUserId)}`,
      );
    }
  }
}
