"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LEGAL_LOCALE_STORAGE_KEY,
  parseLegalLocale,
  type LegalLocale,
} from "@/lib/legal/locale";

export function useLandingLocale() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [locale, setLocaleState] = useState<LegalLocale>("es");

  useEffect(() => {
    const fromUrl = searchParams.get("lang");
    const fromStorage =
      typeof window !== "undefined"
        ? localStorage.getItem(LEGAL_LOCALE_STORAGE_KEY)
        : null;
    const next = parseLegalLocale(fromUrl ?? fromStorage ?? "es");
    setLocaleState(next);
    document.documentElement.lang = next;
  }, [searchParams]);

  const setLocale = useCallback(
    (next: LegalLocale) => {
      setLocaleState(next);
      localStorage.setItem(LEGAL_LOCALE_STORAGE_KEY, next);
      document.documentElement.lang = next;

      const params = new URLSearchParams(searchParams.toString());
      if (next === "es") {
        params.delete("lang");
      } else {
        params.set("lang", "en");
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { locale, setLocale };
}
