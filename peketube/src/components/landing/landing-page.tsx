"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Monitor, Smartphone, Tablet } from "lucide-react";
import { LegalLocaleToggle } from "@/components/legal/legal-locale-toggle";
import { ContactForm } from "@/components/contact/contact-form";
import { ForkMeOnGitHub } from "@/components/landing/fork-me-on-github";
import { LandingHeroLogo } from "@/components/landing/landing-hero-logo";
import {
  LandingImageLightbox,
  type LandingLightboxImage,
} from "@/components/landing/landing-image-lightbox";
import { useLandingLocale } from "@/components/landing/use-landing-locale";
import { PEKETUBE_APP_URL } from "@/lib/landing/constants";
import type { LegalLocale } from "@/lib/legal/locale";
import { cn } from "@/lib/utils";

type Shot = {
  src: string;
  altEs: string;
  altEn: string;
  captionEs: string;
  captionEn: string;
};

const SCREENSHOTS: Shot[] = [
  {
    src: "/landing/home-feed.png",
    altEs: "Inicio de PekeTube con vídeos infantiles",
    altEn: "PekeTube home feed with kids videos",
    captionEs: "Inicio con categorías y aspecto similar a YouTube",
    captionEn: "Home with categories and a YouTube-like layout",
  },
  {
    src: "/landing/parental-blocked.png",
    altEs: "Panel parental — listas de bloqueo",
    altEn: "Parental panel — block lists",
    captionEs: "Bloquea canales, vídeos o palabras en el título",
    captionEn: "Block channels, videos, or words in titles",
  },
  {
    src: "/landing/parental-settings.png",
    altEs: "Ajustes del panel parental",
    altEn: "Parental panel settings",
    captionEs: "Categorías, scroll limitado, tema y modo infantil",
    captionEn: "Categories, limited scroll, theme, and kids mode",
  },
  {
    src: "/landing/you-page.png",
    altEs: "Página Tú con historial local",
    altEn: "You page with local history",
    captionEs: "Historial y perfil (con sesión Google opcional)",
    captionEn: "History and profile (optional Google sign-in)",
  },
];

function t(locale: LegalLocale, es: string, en: string) {
  return locale === "en" ? en : es;
}

export function LandingPageClient() {
  const { locale, setLocale } = useLandingLocale();
  const [lightboxImage, setLightboxImage] =
    useState<LandingLightboxImage | null>(null);
  const privacyHref =
    locale === "en"
      ? `${PEKETUBE_APP_URL}/privacy?lang=en`
      : `${PEKETUBE_APP_URL}/privacy`;
  const aboutHref =
    locale === "en"
      ? `${PEKETUBE_APP_URL}/about?lang=en`
      : `${PEKETUBE_APP_URL}/about`;
  const contactAppHref =
    locale === "en"
      ? `${PEKETUBE_APP_URL}/contact?lang=en`
      : `${PEKETUBE_APP_URL}/contact`;

  return (
    <div className="min-h-dvh bg-[#fafafa] text-[#0F0F0F]">
      <ForkMeOnGitHub />
      <header className="sticky top-0 z-50 border-b border-[#e5e5e5] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-lg font-bold tracking-tight">PekeTube</span>
          <div className="flex items-center gap-3">
            <LegalLocaleToggle locale={locale} onChange={setLocale} />
            <a
              href={PEKETUBE_APP_URL}
              className="hidden rounded-full bg-[#E62117] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#cc1d14] sm:inline-flex sm:items-center sm:gap-1.5"
            >
              {t(locale, "Ir a PekeTube", "Open PekeTube")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="border-b border-[#e5e5e5] bg-white px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <LandingHeroLogo />
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[#3f3f3f] sm:text-xl">
              {t(
                locale,
                "Una interfaz parecida a YouTube, pensada para familias que necesitan más control sobre lo que ven sus hijos — sin sustituir tu criterio como padre o madre.",
                "A YouTube-like interface for families who need more control over what their children watch — without replacing your judgment as a parent.",
              )}
            </p>
            <a
              href={PEKETUBE_APP_URL}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#E62117] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-[#E62117]/25 transition hover:bg-[#cc1d14] sm:text-lg"
            >
              {t(locale, "Ir a PekeTube", "Open PekeTube")}
              <ArrowRight className="h-5 w-5" aria-hidden />
            </a>
            <p className="mt-3 text-sm text-[#606060]">
              {t(
                locale,
                "Si quieres probarlo ya:",
                "If you want to try it now:",
              )}{" "}
              <a
                href={PEKETUBE_APP_URL}
                className="font-medium text-[#065fd4] underline-offset-2 hover:underline"
              >
                peketube.amian.es
              </a>
            </p>
          </div>
        </section>

        {/* Story */}
        <section className="px-4 py-12 sm:py-14">
          <div className="mx-auto max-w-5xl space-y-4 text-[#3f3f3f] leading-relaxed">
            <h2 className="text-2xl font-bold text-[#0F0F0F] sm:text-3xl">
              {t(locale, "Por qué existe", "Why it exists")}
            </h2>
            <p>
              {t(
                locale,
                "Soy David, ingeniero informático y padre de Pablo, un niño con autismo. A Pablo le encanta YouTube: conoce la app «de verdad», le resulta familiar y la busca a propósito. YouTube Kids no encajaba con lo que él necesita.",
                "I'm David, a software engineer and father of Pablo, a child on the autism spectrum. Pablo loves YouTube: he knows the real app, finds it familiar, and looks for it on purpose. YouTube Kids did not fit what he needs.",
              )}
            </p>
            <p>
              {t(
                locale,
                "El problema no era solo contenido inapropiado, sino vídeos sobrestimulantes — muchas escenas a la vez, ruido constante, montajes caóticos — que le desregulan. Quería algo que se pareciera a YouTube (inicio, búsqueda, reproductor, suscripciones…) pero con un entorno más acotado y un panel parental donde bloquear canales, vídeos o palabras en el título.",
                "The issue was not only inappropriate content, but overstimulating videos — too many scenes at once, constant noise, chaotic edits — that dysregulate him. I wanted something that looks like YouTube (home, search, player, subscriptions…) but in a more bounded environment, with a parental panel to block channels, videos, or words in titles.",
              )}
            </p>
            <p>
              {t(
                locale,
                "Lo desarrollé para casa y lo comparto por si otra familia se encuentra en una situación parecida. No es un producto comercial ni un servicio con soporte oficial, pero si tienes dudas, sugerencias o simplemente quieres contarme si te ha servido, puedes escribirme más abajo.",
                "I built it for home use and share it in case another family is in a similar situation. It is not a commercial product or an official support service, but if you have questions, suggestions, or simply want to tell me it helped you, you can write to me below.",
              )}
            </p>
          </div>
        </section>

        {/* Features + screenshots */}
        <section className="border-y border-[#e5e5e5] bg-white px-4 py-12 sm:py-14">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold text-[#0F0F0F] sm:text-3xl">
              {t(locale, "Qué puedes hacer", "What you can do")}
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                t(
                  locale,
                  "Navegar con aspecto similar a YouTube en móvil, tablet o PC",
                  "Browse with a YouTube-like UI on phone, tablet, or PC",
                ),
                t(
                  locale,
                  "Modo invitado sin cuenta o sesión Google opcional",
                  "Guest mode without an account, or optional Google sign-in",
                ),
                t(
                  locale,
                  "PIN parental, listas de bloqueo e historial configurable",
                  "Parental PIN, block lists, and configurable history",
                ),
                t(
                  locale,
                  "Categorías, comentarios, autoplay y salto en el reproductor",
                  "Categories, comments, autoplay, and seek step in the player",
                ),
              ].map((item) => (
                <li
                  key={item}
                  className="flex gap-2 rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-3 text-sm text-[#3f3f3f]"
                >
                  <span className="mt-0.5 text-[#E62117]" aria-hidden>
                    ●
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              {SCREENSHOTS.map((shot) => {
                const alt = t(locale, shot.altEs, shot.altEn);
                const caption = t(locale, shot.captionEs, shot.captionEn);
                return (
                  <figure key={shot.src} className="space-y-2">
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxImage({ src: shot.src, alt, caption })
                      }
                      className="block w-full cursor-zoom-in overflow-hidden rounded-xl border border-[#e5e5e5] shadow-sm transition hover:border-[#c4c4c4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#065fd4]"
                      aria-label={t(
                        locale,
                        `Ampliar imagen: ${shot.altEs}`,
                        `Enlarge image: ${shot.altEn}`,
                      )}
                    >
                      <Image
                        src={shot.src}
                        alt={alt}
                        width={800}
                        height={500}
                        className="h-auto w-full"
                      />
                    </button>
                    <figcaption className="text-center text-sm text-[#606060]">
                      {caption}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </div>
        </section>

        {/* Install */}
        <section className="px-4 py-12 sm:py-14">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold text-[#0F0F0F] sm:text-3xl">
              {t(locale, "Cómo usarlo", "How to use it")}
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: Smartphone,
                  titleEs: "Móvil / tablet (PWA)",
                  titleEn: "Phone / tablet (PWA)",
                  bodyEs:
                    "Abre peketube.amian.es en Chrome o Safari → «Añadir a la pantalla de inicio» o «Instalar aplicación». Funciona como app sin tienda.",
                  bodyEn:
                    "Open peketube.amian.es in Chrome or Safari → Add to Home Screen or Install app. Works like an app without an app store.",
                },
                {
                  icon: Monitor,
                  titleEs: "PC y navegador",
                  titleEn: "PC and browser",
                  bodyEs:
                    "Cualquier ordenador con navegador moderno. También puedes instalar la PWA en escritorio (Chrome → Instalar).",
                  bodyEn:
                    "Any computer with a modern browser. You can also install the PWA on desktop (Chrome → Install).",
                },
                {
                  icon: Tablet,
                  titleEs: "APK Android (próximamente)",
                  titleEn: "Android APK (coming soon)",
                  bodyEs:
                    "Estoy preparando un APK independiente para Android. Se anunciará aquí cuando esté listo.",
                  bodyEn:
                    "A standalone Android APK is in progress. It will be announced here when ready.",
                },
              ].map(({ icon: Icon, titleEs, titleEn, bodyEs, bodyEn }) => (
                <div
                  key={titleEs}
                  className="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-sm"
                >
                  <Icon className="mb-3 h-8 w-8 text-[#E62117]" aria-hidden />
                  <h3 className="font-semibold text-[#0F0F0F]">
                    {t(locale, titleEs, titleEn)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#606060]">
                    {t(locale, bodyEs, bodyEn)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy & Google */}
        <section className="border-t border-[#e5e5e5] bg-white px-4 py-12 sm:py-14">
          <div className="mx-auto max-w-5xl space-y-6">
            <h2 className="text-2xl font-bold text-[#0F0F0F] sm:text-3xl">
              {t(locale, "Privacidad y Google", "Privacy and Google")}
            </h2>
            <div className="space-y-4 text-[#3f3f3f] leading-relaxed">
              <p>
                {t(
                  locale,
                  "No vendemos datos ni hay analítica de terceros. Los ajustes y listas de bloqueo se guardan en tu dispositivo; si inicias sesión, el PIN parental (hash) y el historial pueden sincronizarse en el servidor de esta instancia — nunca contraseñas ni datos bancarios.",
                  "We do not sell data and there is no third-party analytics. Settings and block lists are stored on your device; if you sign in, the parental PIN (hashed) and history may sync on this instance's server — never passwords or payment data.",
                )}
              </p>
              <div
                className={cn(
                  "rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950",
                )}
              >
                <p className="font-medium">
                  {t(
                    locale,
                    "Aviso al iniciar sesión con Google",
                    "Google sign-in notice",
                  )}
                </p>
                <p className="mt-2">
                  {t(
                    locale,
                    "Google puede mostrar que la app «no está verificada» o «no es segura». Es normal en proyectos personales: estamos en proceso de verificación oficial del dominio y de los permisos de YouTube (solo lectura). No es un virus: es el flujo OAuth estándar de Google. Puedes usar PekeTube en modo invitado sin cuenta.",
                    "Google may show that the app is unverified or not secure. This is normal for personal projects: we are going through official domain and YouTube read-only permission verification. It is not malware: it is Google's standard OAuth flow. You can use PekeTube in guest mode without an account.",
                  )}
                </p>
              </div>
              <p className="text-sm">
                <Link
                  href={privacyHref}
                  className="font-medium text-[#065fd4] underline-offset-2 hover:underline"
                >
                  {t(locale, "Política de privacidad", "Privacy policy")}
                </Link>
                {" · "}
                <Link
                  href={aboutHref}
                  className="font-medium text-[#065fd4] underline-offset-2 hover:underline"
                >
                  {t(locale, "Acerca de en la app", "About in the app")}
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section
          id="contact"
          className="border-t border-[#e5e5e5] bg-white px-4 py-12 sm:py-14"
        >
          <div className="mx-auto max-w-xl">
            <h2 className="text-2xl font-bold text-[#0F0F0F] sm:text-3xl">
              {t(locale, "Escríbeme", "Get in touch")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#606060]">
              {t(
                locale,
                "Dudas, sugerencias, impresiones o felicitaciones — lo que quieras. Déjame tu correo para poder responderte.",
                "Questions, suggestions, feedback, or thanks — anything you like. Leave your email so I can reply.",
              )}
            </p>
            <ContactForm locale={locale} className="mt-6" />
            <p className="mt-4 text-xs text-[#606060]">
              {t(
                locale,
                "También disponible en la app:",
                "Also available in the app:",
              )}{" "}
              <a
                href={contactAppHref}
                className="font-medium text-[#065fd4] underline-offset-2 hover:underline"
              >
                {t(locale, "página de contacto", "contact page")}
              </a>
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-[#e5e5e5] px-4 py-12 text-center sm:py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold text-[#0F0F0F]">
              {t(locale, "¿Listo para probarlo?", "Ready to try it?")}
            </h2>
            <a
              href={PEKETUBE_APP_URL}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#E62117] px-10 py-4 text-lg font-semibold text-white shadow-lg shadow-[#E62117]/25 transition hover:bg-[#cc1d14]"
            >
              {t(locale, "Ir a PekeTube", "Open PekeTube")}
              <ArrowRight className="h-5 w-5" aria-hidden />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e5e5e5] bg-[#f1f1f1] px-4 py-6 text-center text-xs text-[#606060]">
        <p>
          PekeTube — {t(locale, "proyecto personal", "personal project")} ·{" "}
          {t(locale, "no afiliado a Google ni YouTube", "not affiliated with Google or YouTube")}
        </p>
        <p className="mt-1">
          <a
            href={PEKETUBE_APP_URL}
            className="text-[#065fd4] underline-offset-2 hover:underline"
          >
            peketube.amian.es
          </a>
          {" · "}
          <a
            href="#contact"
            className="text-[#065fd4] underline-offset-2 hover:underline"
          >
            {t(locale, "Contacto", "Contact")}
          </a>
        </p>
      </footer>

      <LandingImageLightbox
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
        closeLabel={t(locale, "Cerrar imagen ampliada", "Close enlarged image")}
      />
    </div>
  );
}
