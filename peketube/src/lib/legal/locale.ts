export type LegalLocale = "es" | "en";

export const LEGAL_LOCALE_STORAGE_KEY = "peketube-legal-locale";

export function parseLegalLocale(value: string | null | undefined): LegalLocale {
  return value === "en" ? "en" : "es";
}
