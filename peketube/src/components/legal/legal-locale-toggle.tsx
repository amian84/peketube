"use client";

import { cn } from "@/lib/utils";
import type { LegalLocale } from "@/lib/legal/locale";

type LegalLocaleToggleProps = {
  locale: LegalLocale;
  onChange: (locale: LegalLocale) => void;
  className?: string;
};

const options: { id: LegalLocale; label: string }[] = [
  { id: "es", label: "ES" },
  { id: "en", label: "EN" },
];

export function LegalLocaleToggle({
  locale,
  onChange,
  className,
}: LegalLocaleToggleProps) {
  return (
    <div
      role="group"
      aria-label={locale === "es" ? "Idioma" : "Language"}
      className={cn(
        "inline-flex shrink-0 rounded-lg border border-[var(--yt-border)] bg-[var(--yt-surface)] p-0.5",
        className,
      )}
    >
      {options.map(({ id, label }) => {
        const active = locale === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(id)}
            className={cn(
              "min-w-[2.25rem] rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-[var(--yt-text-primary)] text-[var(--yt-bg)]"
                : "text-[var(--yt-text-secondary)] hover:text-[var(--yt-text-primary)]",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
