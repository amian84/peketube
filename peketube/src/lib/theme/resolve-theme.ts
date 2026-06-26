export type ThemeMode = "auto" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

/** Modo oscuro desde las 20:00 hasta las 6:59 (hora local). */
export const THEME_AUTO_DARK_START_HOUR = 20;
export const THEME_AUTO_DARK_END_HOUR = 7;

export function isAutoDarkHour(hour: number): boolean {
  return hour >= THEME_AUTO_DARK_START_HOUR || hour < THEME_AUTO_DARK_END_HOUR;
}

export function resolveTheme(
  mode: ThemeMode,
  now: Date = new Date(),
): ResolvedTheme {
  if (mode === "light") return "light";
  if (mode === "dark") return "dark";
  return isAutoDarkHour(now.getHours()) ? "dark" : "light";
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "auto" || value === "light" || value === "dark";
}
