import {
  resolveTheme,
  THEME_AUTO_DARK_END_HOUR,
  THEME_AUTO_DARK_START_HOUR,
  type ResolvedTheme,
  type ThemeMode,
} from "@/lib/theme/resolve-theme";

const THEME_CACHE_KEY = "peketube-theme";

type ThemeCache = {
  mode: ThemeMode;
  resolved: ResolvedTheme;
};

export function readThemeCache(): ThemeCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(THEME_CACHE_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as ThemeCache;
    if (
      j.mode !== "auto" &&
      j.mode !== "light" &&
      j.mode !== "dark"
    ) {
      return null;
    }
    if (j.resolved !== "light" && j.resolved !== "dark") return null;
    return j;
  } catch {
    return null;
  }
}

export function writeThemeCache(mode: ThemeMode, resolved: ResolvedTheme): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      THEME_CACHE_KEY,
      JSON.stringify({ mode, resolved } satisfies ThemeCache),
    );
  } catch {
    /* quota / private mode */
  }
}

/** Script inline en layout: evita flash antes de hidratar React. */
export function themeBootstrapScript(): string {
  const start = THEME_AUTO_DARK_START_HOUR;
  const end = THEME_AUTO_DARK_END_HOUR;
  return `(function(){try{var k="peketube-theme";var r=localStorage.getItem(k);var dark;var h=new Date().getHours();var autoDark=h>=${start}||h<${end};if(r){var j=JSON.parse(r);if(j.resolved==="light")dark=false;else if(j.resolved==="dark")dark=true;else if(j.mode==="light")dark=false;else if(j.mode==="dark")dark=true;else dark=autoDark;}else{dark=autoDark;}document.documentElement.classList.toggle("dark",dark);}catch(e){document.documentElement.classList.add("dark");}})();`;
}

export function applyResolvedTheme(resolved: ResolvedTheme): void {
  document.documentElement.classList.toggle("dark", resolved === "dark");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? "#0F0F0F" : "#FFFFFF");
  }
}

export function syncThemeFromMode(mode: ThemeMode): ResolvedTheme {
  const resolved = resolveTheme(mode);
  applyResolvedTheme(resolved);
  writeThemeCache(mode, resolved);
  return resolved;
}
