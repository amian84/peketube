import {
  readBlacklistSnapshot,
  replaceAllFromSnapshot,
} from "@/lib/db/blacklist";
import {
  getSettingsFromDexie,
  saveSettingsToDexie,
  type PeketubeSettings,
} from "@/lib/db/settings";
import {
  snapshotFromWire,
  snapshotToWire,
  type BlacklistWire,
} from "@/lib/yt/filter";

const EXPORT_VERSION = 1;

export type PeketubeConfigExport = {
  version: number;
  settings: Partial<PeketubeSettings>;
  blacklist?: BlacklistWire;
};

export async function buildPeketubeConfigExport(): Promise<PeketubeConfigExport> {
  const settings = await getSettingsFromDexie();
  const snap = await readBlacklistSnapshot();
  return {
    version: EXPORT_VERSION,
    settings: { ...settings },
    blacklist: snapshotToWire(snap),
  };
}

export async function downloadPeketubeConfigExport(): Promise<void> {
  const payload = await buildPeketubeConfigExport();
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `peketube-config-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Importa ajustes + blacklist local (sin PIN). */
export async function applyPeketubeConfigImport(
  raw: unknown,
): Promise<{ ok: boolean; message: string }> {
  if (!raw || typeof raw !== "object") {
    return { ok: false, message: "JSON inválido." };
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.version !== "number" || o.version < 1) {
    return { ok: false, message: "Versión de export no reconocida." };
  }
  const partial = o.settings;
  if (partial && typeof partial === "object") {
    await saveSettingsToDexie(partial as Partial<PeketubeSettings>);
  }
  if (o.blacklist && typeof o.blacklist === "object") {
    const wire = o.blacklist as BlacklistWire;
    const snap = snapshotFromWire(wire);
    await replaceAllFromSnapshot(snap);
    try {
      const { pushBlacklistToServer } = await import("@/lib/db/blacklist");
      await pushBlacklistToServer();
    } catch {
      /* offline / sin sesión */
    }
  }
  return { ok: true, message: "Importación aplicada." };
}
