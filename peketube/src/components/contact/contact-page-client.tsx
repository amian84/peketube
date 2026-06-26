"use client";

import Link from "next/link";
import { ContactForm } from "@/components/contact/contact-form";
import { LegalLocaleToggle } from "@/components/legal/legal-locale-toggle";
import { useLandingLocale } from "@/components/landing/use-landing-locale";
import { MAIN_BOTTOM_PAD } from "@/lib/layout/responsive";
import type { LegalLocale } from "@/lib/legal/locale";

function t(locale: LegalLocale, es: string, en: string) {
  return locale === "en" ? en : es;
}

export function ContactPageClient() {
  const { locale, setLocale } = useLandingLocale();

  return (
    <article
      className={`mx-auto max-w-lg px-4 py-6 pb-8 text-[var(--yt-text-primary)] lg:max-w-xl ${MAIN_BOTTOM_PAD}`}
    >
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="mb-2 text-2xl font-semibold">
            {t(locale, "Contacto", "Contact")}
          </h1>
          <p className="text-sm leading-relaxed text-[var(--yt-text-secondary)]">
            {t(
              locale,
              "PekeTube no es un servicio comercial con soporte oficial, pero si tienes dudas, sugerencias, impresiones o simplemente quieres decir que te ha servido, puedes escribirme. Responderé en cuanto pueda.",
              "PekeTube is not a commercial service with official support, but if you have questions, suggestions, feedback, or just want to say it helped you, you can write to me. I'll reply as soon as I can.",
            )}
          </p>
        </div>
        <LegalLocaleToggle locale={locale} onChange={setLocale} />
      </header>

      <ContactForm locale={locale} />

      <p className="mt-8 text-center text-xs text-muted-foreground">
        <Link href="/" className="text-[#3ea6ff] underline-offset-2 hover:underline">
          {t(locale, "Volver al inicio", "Back to home")}
        </Link>
        {" · "}
        <Link
          href={locale === "en" ? "/about?lang=en" : "/about"}
          className="text-[#3ea6ff] underline-offset-2 hover:underline"
        >
          {t(locale, "Acerca de", "About")}
        </Link>
      </p>
    </article>
  );
}
