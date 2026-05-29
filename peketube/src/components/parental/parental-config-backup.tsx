"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useBlacklist } from "@/components/providers/blacklist-provider";
import { Button } from "@/components/ui/button";
import {
  applyPeketubeConfigImport,
  downloadPeketubeConfigExport,
} from "@/lib/parental/config-export";
import { postBlacklistImportMerge } from "@/lib/db/blacklist";

/** Export / import JSON: ajustes + lista negra (sin PIN). Prompt 07. */
export function ParentalConfigBackup() {
  const { status } = useSession();
  const { refreshFromLocal } = useBlacklist();
  const [msg, setMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium">Copia de seguridad (config)</p>
      <p className="text-xs text-muted-foreground">
        Incluye ajustes de la app y listas negras locales. No incluye el PIN.
      </p>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => {
          void downloadPeketubeConfigExport();
          setMsg("Descarga de configuración iniciada.");
        }}
      >
        Exportar JSON completo
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
          try {
            if (
              parsed &&
              typeof parsed === "object" &&
              "version" in (parsed as object) &&
              typeof (parsed as { version?: unknown }).version === "number"
            ) {
              const r = await applyPeketubeConfigImport(parsed);
              setMsg(r.message);
              await refreshFromLocal();
              return;
            }
            if (status !== "authenticated") {
              setMsg(
                "JSON antiguo solo-blacklist: inicia sesión para fusionar en servidor.",
              );
              return;
            }
            const ok = await postBlacklistImportMerge(parsed);
            if (ok) {
              await refreshFromLocal();
              setMsg("Lista negra fusionada (formato antiguo).");
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
        Importar JSON
      </Button>
      {msg ? (
        <p className="text-xs text-muted-foreground" role="status">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
