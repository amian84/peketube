"use client";

import { usePeketubeSettings } from "@/hooks/use-peketube-settings";
import { resolveTheme } from "@/lib/theme/resolve-theme";
import {
  applyResolvedTheme,
  writeThemeCache,
} from "@/lib/theme/theme-cache";
import { useEffect } from "react";

const AUTO_CHECK_MS = 60_000;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { themeMode } = usePeketubeSettings();

  useEffect(() => {
    const apply = () => {
      const resolved = resolveTheme(themeMode);
      applyResolvedTheme(resolved);
      writeThemeCache(themeMode, resolved);
    };

    apply();

    if (themeMode !== "auto") return;

    const id = window.setInterval(apply, AUTO_CHECK_MS);
    return () => window.clearInterval(id);
  }, [themeMode]);

  return children;
}
