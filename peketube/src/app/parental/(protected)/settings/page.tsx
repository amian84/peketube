"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { ParentalConfigBackup } from "@/components/parental/parental-config-backup";
import { useBlacklist } from "@/components/providers/blacklist-provider";
import { Button } from "@/components/ui/button";
import { clearHistory } from "@/lib/db/history";
import {
  getSettingsFromDexie,
  saveSettingsToDexie,
  wipeLocalPeketubeStoresKeepAppSettings,
  type HistoryRecordMode,
  type PeketubeSettings,
} from "@/lib/db/settings";
import { changeParentalPin } from "@/lib/parental/pin";
import { clearRecoveryGate } from "@/lib/parental/recovery-gate";
import { lockParentalSession } from "@/lib/parental/session";
import {
  DEFAULT_PARENTAL_SESSION_TTL_MS,
  MAX_PARENTAL_SESSION_TTL_MS,
  MIN_PARENTAL_SESSION_TTL_MS,
} from "@/lib/parental/constants";
import { PARENT_CATEGORY_OPTIONS } from "@/lib/yt/constants";

const YOUTUBE_PARENT_CATEGORY_LABELS: Record<number, string> = {
  1: "Cine y animación",
  10: "Música",
  15: "Mascotas",
  22: "Personas y blogs",
  24: "Entretenimiento",
  26: "Cómo hacer y estilo",
  27: "Educación",
  28: "Ciencia y tecnología",
};

function categoryLabel(id: number): string {
  return YOUTUBE_PARENT_CATEGORY_LABELS[id] ?? `Categoría ${id}`;
}

export default function ParentalSettingsPage() {
  const { refreshFromLocal } = useBlacklist();
  const [s, setS] = useState<PeketubeSettings | null>(null);
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPin2, setNewPin2] = useState("");
  const [pinMsg, setPinMsg] = useState("");
  const [histMsg, setHistMsg] = useState("");
  const [resetStep, setResetStep] = useState(0);

  const load = useCallback(async () => {
    setS(await getSettingsFromDexie());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!s) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  const ttlMin = Math.round(
    (s.parentalSessionTtlMs ?? DEFAULT_PARENTAL_SESSION_TTL_MS) / 60_000,
  );

  const toggleCategory = async (id: number) => {
    const has = s.allowedCategoryIds.includes(id);
    const next = has
      ? s.allowedCategoryIds.filter((x) => x !== id)
      : [...s.allowedCategoryIds, id];
    if (next.length === 0) return;
    const merged = await saveSettingsToDexie({ allowedCategoryIds: next });
    setS(merged);
  };

  const changePin = async () => {
    setPinMsg("");
    if (!/^\d{4}$/.test(oldPin) || !/^\d{4}$/.test(newPin) || newPin !== newPin2) {
      setPinMsg("PINs inválidos o no coinciden.");
      return;
    }
    const r = await changeParentalPin(oldPin, newPin);
    if (r === "OLD_PIN_WRONG") {
      setPinMsg("PIN actual incorrecto.");
      return;
    }
    if (r === "AUTH_REQUIRED") {
      setPinMsg("Sesión Google caducada. Vuelve a iniciar sesión.");
      return;
    }
    if (r !== "ok") {
      setPinMsg("Error al guardar.");
      return;
    }
    setOldPin("");
    setNewPin("");
    setNewPin2("");
    setPinMsg("PIN actualizado.");
  };

  const clearHist = async () => {
    if (!confirm("¿Borrar todo el historial (servidor y caché de este dispositivo)?"))
      return;
    await clearHistory();
    setHistMsg("Historial borrado.");
  };

  const wipeAll = async () => {
    if (resetStep === 0) {
      setResetStep(1);
      return;
    }
    if (
      !confirm(
        "Se borrarán en el servidor (cuenta Google): PIN parental, lista negra e historial si existe. En este dispositivo se borran historial local, caché de API y listas locales; solo se conservan los ajustes del panel (categorías, modo infantil, reproductor, etc.). ¿Seguro?",
      )
    ) {
      setResetStep(0);
      return;
    }
    const settingsSnapshot = s;
    if (!settingsSnapshot) {
      setResetStep(0);
      return;
    }
    try {
      const res = await fetch("/api/account/wipe-server", {
        method: "POST",
        credentials: "same-origin",
      });
      if (res.status === 401) {
        alert(
          "Inicia sesión con Google para borrar los datos del servidor; no se ha modificado este dispositivo.",
        );
        setResetStep(0);
        return;
      }
      if (!res.ok) {
        alert("No se pudo completar el borrado en el servidor. Reintenta más tarde.");
        setResetStep(0);
        return;
      }
      await wipeLocalPeketubeStoresKeepAppSettings(settingsSnapshot);
      await refreshFromLocal();
      clearRecoveryGate();
      lockParentalSession();
      setResetStep(0);
      window.location.href = "/";
    } catch {
      alert("Error de red. No se ha aplicado el reset.");
      setResetStep(0);
    }
  };

  return (
    <div className="space-y-8 pb-8">
      <h1 className="text-lg font-semibold">Ajustes</h1>

      <section className="space-y-2 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">Categorías permitidas (feed)</h2>
        <div className="flex flex-col gap-2">
          {PARENT_CATEGORY_OPTIONS.map((id) => (
            <label key={id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={s.allowedCategoryIds.includes(id)}
                onChange={() => void toggleCategory(id)}
              />
              {categoryLabel(id)}
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-2 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">Scroll infinito (home y búsqueda)</h2>
        <p className="text-xs text-muted-foreground">
          Cuántos vídeos se piden a YouTube al bajar en home y búsqueda. Al llegar
          a ese tope ya no se llama a la API; si sigues bajando, se añaden de 10 en
          10 reutilizando los que ya cargó (la lista puede crecer por encima del
          tope). Rango 24–300.
        </p>
        <label className="block text-xs text-muted-foreground">
          Máx. vídeos antes del bucle
          <input
            type="number"
            min={24}
            max={300}
            className="mt-1 w-full rounded border border-border bg-background px-2 py-2 text-sm"
            value={s.scrollLoopMaxItems}
            onChange={async (e) => {
              const n = Math.floor(Number(e.target.value));
              if (!Number.isFinite(n) || n < 24 || n > 300) return;
              const merged = await saveSettingsToDexie({ scrollLoopMaxItems: n });
              setS(merged);
            }}
          />
        </label>
      </section>

      <section className="space-y-2 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">Solo contenido infantil (madeForKids)</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={s.strictKidsOnly}
            onChange={async (e) => {
              const merged = await saveSettingsToDexie({
                strictKidsOnly: e.target.checked,
              });
              setS(merged);
            }}
          />
          Activado (recomendado para niños)
        </label>
      </section>

      <section className="space-y-2 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">Sesión parental (inactividad)</h2>
        <p className="text-xs text-muted-foreground">
          Minutos hasta que haya que volver a poner el PIN al entrar al panel
          (1–60).
        </p>
        <input
          type="number"
          min={1}
          max={60}
          className="w-24 rounded border border-border bg-background px-2 py-1 text-sm"
          value={ttlMin}
          onChange={async (e) => {
            const m = Math.floor(Number(e.target.value));
            if (!Number.isFinite(m) || m < 1 || m > 60) return;
            const ms = m * 60_000;
            const clamped = Math.min(
              MAX_PARENTAL_SESSION_TTL_MS,
              Math.max(MIN_PARENTAL_SESSION_TTL_MS, ms),
            );
            const merged = await saveSettingsToDexie({
              parentalSessionTtlMs: clamped,
            });
            setS(merged);
          }}
        />
      </section>

      <section className="space-y-2 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">Reproductor</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={s.autoPlayNext}
            onChange={async (e) => {
              const merged = await saveSettingsToDexie({
                autoPlayNext: e.target.checked,
              });
              setS(merged);
            }}
          />
          Autoplay siguiente vídeo
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={s.showVideoComments}
            onChange={async (e) => {
              const merged = await saveSettingsToDexie({
                showVideoComments: e.target.checked,
              });
              setS(merged);
            }}
          />
          Mostrar comentarios en /watch
        </label>
      </section>

      <section className="space-y-2 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">Historial (local)</h2>
        <label className="block text-xs text-muted-foreground">
          Modo de registro
          <select
            className="mt-1 w-full rounded border border-border bg-background px-2 py-2 text-sm"
            value={s.historyRecordMode}
            onChange={async (e) => {
              const v = e.target.value as HistoryRecordMode;
              const merged = await saveSettingsToDexie({ historyRecordMode: v });
              setS(merged);
            }}
          >
            <option value="on_play">Al reproducir (primer PLAYING)</option>
            <option value="after_10s">Tras 10 s de visionado</option>
            <option value="on_end">Al terminar el vídeo</option>
          </select>
        </label>
        <label className="mt-2 block text-xs text-muted-foreground">
          Retención (días, 1–365)
          <input
            type="number"
            min={1}
            max={365}
            className="mt-1 w-full rounded border border-border bg-background px-2 py-2 text-sm"
            value={s.historyRetentionDays}
            onChange={async (e) => {
              const d = Math.floor(Number(e.target.value));
              if (!Number.isFinite(d) || d < 1 || d > 365) return;
              const merged = await saveSettingsToDexie({
                historyRetentionDays: d,
              });
              setS(merged);
            }}
          />
        </label>
        <Button type="button" variant="destructive" size="sm" onClick={() => void clearHist()}>
          Borrar historial
        </Button>
        {histMsg ? (
          <p className="text-xs text-muted-foreground">{histMsg}</p>
        ) : null}
      </section>

      <section className="space-y-2 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">Cambiar PIN</h2>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="PIN actual"
          className="w-full rounded border border-border bg-background px-2 py-2 text-sm"
          value={oldPin}
          onChange={(e) =>
            setOldPin(e.target.value.replace(/\D/g, "").slice(0, 4))
          }
        />
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="PIN nuevo"
          className="w-full rounded border border-border bg-background px-2 py-2 text-sm"
          value={newPin}
          onChange={(e) =>
            setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))
          }
        />
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="Repetir PIN nuevo"
          className="w-full rounded border border-border bg-background px-2 py-2 text-sm"
          value={newPin2}
          onChange={(e) =>
            setNewPin2(e.target.value.replace(/\D/g, "").slice(0, 4))
          }
        />
        <Button type="button" size="sm" onClick={() => void changePin()}>
          Guardar nuevo PIN
        </Button>
        {pinMsg ? <p className="text-xs text-muted-foreground">{pinMsg}</p> : null}
      </section>

      <ParentalConfigBackup />

      <section className="space-y-2 rounded-lg border border-destructive/40 p-4">
        <h2 className="text-sm font-medium text-destructive">Zona peligrosa</h2>
        <p className="text-xs text-muted-foreground">
          Llama al servidor para borrar PIN, bloqueos e historial en SQLite (misma
          cuenta Google) y limpia en este dispositivo historial, caché de API y
          listas locales; solo permanecen los ajustes del panel. Último recurso
          si olvidaste el PIN y la frase (OQ-07-004 A).
        </p>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => void wipeAll()}
        >
          {resetStep === 0 ? "Reset de la app…" : "Confirmar reset total"}
        </Button>
        {resetStep === 1 ? (
          <p className="text-xs text-amber-600">
            Pulsa de nuevo para confirmar. El siguiente paso pide confirmación
            final y borra también datos del servidor.
          </p>
        ) : null}
      </section>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => void signOut({ callbackUrl: "/" })}
      >
        Cerrar sesión Google
      </Button>
    </div>
  );
}
