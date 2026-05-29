"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_PEKETUBE_SETTINGS,
  type PeketubeSettings,
  getSettingsFromDexie,
} from "@/lib/db/settings";

/** Lectura de ajustes Dexie en cliente (panel parental ampliará en prompt 07). */
export function usePeketubeSettings(): PeketubeSettings {
  const [s, setS] = useState<PeketubeSettings>(DEFAULT_PEKETUBE_SETTINGS);

  useEffect(() => {
    let alive = true;
    const load = () => {
      getSettingsFromDexie().then((v) => {
        if (alive) setS(v);
      });
    };
    load();
    const onChange = () => load();
    window.addEventListener("peketube-settings-changed", onChange);
    return () => {
      alive = false;
      window.removeEventListener("peketube-settings-changed", onChange);
    };
  }, []);

  return s;
}
