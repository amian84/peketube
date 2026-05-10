"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_KIDSTUBE_SETTINGS,
  type KidstubeSettings,
  getSettingsFromDexie,
} from "@/lib/db/settings";

/** Lectura de ajustes Dexie en cliente (panel parental ampliará en prompt 07). */
export function useKidstubeSettings(): KidstubeSettings {
  const [s, setS] = useState<KidstubeSettings>(DEFAULT_KIDSTUBE_SETTINGS);

  useEffect(() => {
    let alive = true;
    getSettingsFromDexie().then((v) => {
      if (alive) setS(v);
    });
    return () => {
      alive = false;
    };
  }, []);

  return s;
}
