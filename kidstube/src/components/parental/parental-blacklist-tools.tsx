"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useBlacklist } from "@/components/providers/blacklist-provider";
import { Button } from "@/components/ui/button";
import {
  exportBlacklistDownload,
  postBlacklistImportMerge,
} from "@/lib/db/blacklist";

/** Backup lista negra (prompt 06); el PIN completo llegará en prompt 07. */
export function ParentalBlacklistTools() {
  const { status } = useSession();
  const { refreshFromLocal } = useBlacklist();
  const [msg, setMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mt-8 w-full max-w-sm space-y-3 rounded-lg border border-border bg-card p-4 text-left">
      <p className="text-sm font-medium">Lista negra — backup JSON</p>
      <p className="text-xs text-muted-foreground">
        Exporta el estado local. La importación <strong>fusiona</strong> con el
        servidor si hay sesión (requiere iniciar sesión).
      </p>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => {
          void exportBlacklistDownload();
          setMsg("Descarga iniciada.");
        }}
      >
        Exportar JSON
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          setMsg("");
          if (!f) return;
          let parsed: unknown;
          try {
            parsed = JSON.parse(await f.text());
          } catch {
            setMsg("No es un JSON válido.");
            return;
          }
          if (status !== "authenticated") {
            setMsg("Inicia sesión para fusionar en el servidor y sincronizar.");
            return;
          }
          try {
            const ok = await postBlacklistImportMerge(parsed);
            if (ok) {
              await refreshFromLocal();
              setMsg("Importación fusionada correctamente.");
            } else {
              setMsg("No autorizado (sesión).");
            }
          } catch {
            setMsg("Error al importar.");
          }
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => inputRef.current?.click()}
      >
        Importar JSON (fusionar)
      </Button>
      {msg ? (
        <p className="text-xs text-muted-foreground" role="status">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
