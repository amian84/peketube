"use client";

import Link from "next/link";
import { LegalLocaleToggle } from "@/components/legal/legal-locale-toggle";
import { useLegalLocale } from "@/components/legal/use-legal-locale";
import { MAIN_BOTTOM_PAD } from "@/lib/layout/responsive";
import type { LegalLocale } from "@/lib/legal/locale";

function AboutBody({ locale }: { locale: LegalLocale }) {
  const privacyHref = locale === "en" ? "/privacy?lang=en" : "/privacy";

  if (locale === "en") {
    return (
      <>
        <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
          <p>
            I built PekeTube as a parent for my son with autism. He loves opening
            YouTube and replaying the same videos; the interface feels familiar
            and comforting to him.
          </p>
          <p>
            The problem was not only adult-oriented content, but overstimulating
            videos: too many thumbnails and scenes at once, constant noise,
            distorted colors, or chaotic edits that dysregulate him. YouTube Kids
            did not fit: he specifically looks for YouTube, knows the real app,
            and feels the limitations are not the same there.
          </p>
          <p>
            I wanted something that{" "}
            <strong className="font-medium text-foreground">looks like YouTube</strong>{" "}
            (home, search, player, subscriptions…) but in a more bounded
            environment: kid-friendly categories, filters, and above all a{" "}
            <strong className="font-medium text-foreground">parental panel</strong>{" "}
            where you can block channels, specific videos, or words in titles
            when you see something inappropriate for your child.
          </p>
          <p>
            It does not replace your judgment as a parent: it is a tool to bring
            the experience your child asks for (YouTube) closer to something you
            can supervise and adjust at home.
          </p>
          <p>
            I am sharing it in case someone else wants to use it or is in a
            similar situation. It is not a commercial product or an official
            support service, but if you have questions, suggestions, impressions,
            or simply want to say it helped you, you can write to me on the{" "}
            <Link
              href="/contact?lang=en"
              className="text-[#3ea6ff] underline-offset-2 hover:underline"
            >
              contact page
            </Link>
            .
          </p>
        </div>

        <section className="mt-8 space-y-2 rounded-lg border border-[var(--yt-border)] bg-[var(--yt-surface)] p-4 text-sm">
          <h2 className="font-medium text-foreground">Install as an app</h2>
          <div className="space-y-2 text-muted-foreground">
            <p>
              To use it in app mode on a phone or tablet, you can{" "}
              <strong className="font-medium text-foreground">
                install it as a PWA
              </strong>
              : open PekeTube in the browser (Chrome or Safari) and choose Add to
              Home Screen or Install app.
            </p>
            <p>
              I plan to publish a standalone{" "}
              <strong className="font-medium text-foreground">Android APK</strong>{" "}
              soon. You will be able to download it from this page when it is
              ready.
            </p>
          </div>
        </section>

        <section className="mt-6 space-y-3 rounded-lg border border-[var(--yt-border)] bg-[var(--yt-surface)] p-4 text-sm">
          <h2 className="font-medium text-foreground">Sign in with Google</h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              Connecting Google is{" "}
              <strong className="font-medium text-foreground">optional</strong>{" "}
              (subscriptions, your YouTube quota, server-side history). You can
              also use PekeTube in{" "}
              <strong className="font-medium text-foreground">guest mode</strong>{" "}
              without an account.
            </p>
            <p>
              When you sign in with Google you may see a screen saying the app is{" "}
              <strong className="font-medium text-foreground">not verified</strong>
              . That is normal for personal projects: PekeTube requests read-only
              access to YouTube, and Google requires a long official verification
              process to remove that warning for public apps.{" "}
              <strong className="font-medium text-foreground">
                A verification request is already in progress
              </strong>
              , but Google often takes weeks (or longer) to review it.
            </p>
            <div>
              <p className="mb-2 font-medium text-foreground">
                If you still want to sign in (this instance)
              </p>
              <ol className="list-inside list-decimal space-y-1 pl-1">
                <li>
                  Tap <strong className="text-foreground">Advanced settings</strong>.
                </li>
                <li>
                  Tap <strong className="text-foreground">Go to PekeTube (unsafe)</strong>{" "}
                  or the similar link Google shows.
                </li>
                <li>
                  Accept the permissions. It is not a virus: it is Google&apos;s
                  OAuth flow.
                </li>
              </ol>
            </div>
          </div>
        </section>

        <section className="mt-6 space-y-2 rounded-lg border border-[var(--yt-border)] bg-[var(--yt-surface)] p-4 text-sm">
          <h2 className="font-medium text-foreground">What you can do</h2>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            <li>Browse with a mobile YouTube-like interface.</li>
            <li>Connect your Google account (optional) or use guest mode.</li>
            <li>Set up a parental PIN, block lists, and watch history.</li>
            <li>Choose categories, comments, autoplay, and history retention.</li>
          </ul>
        </section>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link href="/" className="text-[#3ea6ff] underline-offset-2 hover:underline">
            Back to home
          </Link>
          {" · "}
          <Link
            href="/parental/login"
            className="text-[#3ea6ff] underline-offset-2 hover:underline"
          >
            Parental panel
          </Link>
          {" · "}
          <Link
            href={privacyHref}
            className="text-[#3ea6ff] underline-offset-2 hover:underline"
          >
            Privacy
          </Link>
          {" · "}
          <Link
            href="/contact?lang=en"
            className="text-[#3ea6ff] underline-offset-2 hover:underline"
          >
            Contact
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
        <p>
          PekeTube lo desarrollé yo, como padre, para mi hijo con autismo. Le
          encanta abrir YouTube y poner vídeos una y otra vez; la interfaz le
          resulta familiar y reconfortante.
        </p>
        <p>
          El problema no era solo el contenido «para adultos», sino vídeos
          sobrestimulantes: muchas miniaturas y escenas a la vez, ruido
          constante, colores distorsionados o montajes caóticos que le
          desregulan. YouTube Kids no encajaba: él busca YouTube a propósito,
          conoce la app «de verdad» y percibe que ahí no hay las mismas
          limitaciones.
        </p>
        <p>
          Quería algo que{" "}
          <strong className="font-medium text-foreground">se pareciera a YouTube</strong>{" "}
          (inicio, búsqueda, reproductor, suscripciones…) pero con un entorno más
          acotado: categorías infantiles, filtros y, sobre todo, un{" "}
          <strong className="font-medium text-foreground">panel parental</strong> donde
          puedes bloquear canales, vídeos concretos o palabras en el título si
          ves algo inapropiado para tu hijo.
        </p>
        <p>
          No sustituye tu criterio como padre o madre: es una herramienta para
          acercar la experiencia que el niño pide (YouTube) a algo que puedas
          supervisar y ajustar en casa.
        </p>
        <p>
          Ahora lo comparto por si alguien más quiere usarlo o se encuentra en
          una situación parecida. No es un producto comercial ni un servicio con
          soporte oficial, pero si tienes dudas, sugerencias, impresiones o
          simplemente quieres contarme si te ha servido, puedes escribirme en la{" "}
          <Link
            href="/contact"
            className="text-[#3ea6ff] underline-offset-2 hover:underline"
          >
            página de contacto
          </Link>
          .
        </p>
      </div>

      <section className="mt-8 space-y-2 rounded-lg border border-[var(--yt-border)] bg-[var(--yt-surface)] p-4 text-sm">
        <h2 className="font-medium text-foreground">Instalar como app</h2>
        <div className="space-y-2 text-muted-foreground">
          <p>
            Si quieres usarlo en modo «app» en el móvil o la tablet, hoy puedes{" "}
            <strong className="font-medium text-foreground">
              instalarlo como PWA
            </strong>
            : abre PekeTube en el navegador (Chrome o Safari) y usa «Añadir a la
            pantalla de inicio» o «Instalar aplicación».
          </p>
          <p>
            Próximamente subiré un{" "}
            <strong className="font-medium text-foreground">APK independiente</strong>{" "}
            para Android. Podréis descargarlo desde esta misma página cuando esté
            listo.
          </p>
        </div>
      </section>

      <section className="mt-6 space-y-3 rounded-lg border border-[var(--yt-border)] bg-[var(--yt-surface)] p-4 text-sm">
        <h2 className="font-medium text-foreground">Iniciar sesión con Google</h2>
        <div className="space-y-3 text-muted-foreground">
          <p>
            Conectar Google es{" "}
            <strong className="font-medium text-foreground">opcional</strong>{" "}
            (suscripciones, tu cuota de YouTube, historial en servidor). También
            puedes usar PekeTube en{" "}
            <strong className="font-medium text-foreground">modo invitado</strong>{" "}
            sin cuenta.
          </p>
          <p>
            Al entrar con Google puede aparecer una pantalla de Google que dice
            que la aplicación{" "}
            <strong className="font-medium text-foreground">no está verificada</strong>.
            Es normal en proyectos personales: PekeTube pide acceso de solo
            lectura a YouTube y Google exige una verificación oficial larga para
            quitar ese aviso en apps públicas.{" "}
            <strong className="font-medium text-foreground">
              La solicitud de verificación ya está en curso
            </strong>
            , pero Google suele tardar semanas (o más) en revisarla.
          </p>
          <div>
            <p className="mb-2 font-medium text-foreground">
              Si quieres entrar igualmente (esta instancia)
            </p>
            <ol className="list-inside list-decimal space-y-1 pl-1">
              <li>
                Pulsa <strong className="text-foreground">Configuración avanzada</strong>.
              </li>
              <li>
                Pulsa <strong className="text-foreground">Ir a PekeTube (no seguro)</strong>{" "}
                o el enlace similar que muestre Google.
              </li>
              <li>
                Acepta los permisos. No es un virus: es el flujo OAuth de Google.
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section className="mt-6 space-y-2 rounded-lg border border-[var(--yt-border)] bg-[var(--yt-surface)] p-4 text-sm">
        <h2 className="font-medium text-foreground">Qué puedes hacer</h2>
        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
          <li>Navegar con aspecto similar a la app de YouTube en el móvil.</li>
          <li>Conectar tu cuenta de Google (opcional) o usar modo invitado.</li>
          <li>Configurar PIN parental, listas de bloqueo e historial.</li>
          <li>Decidir categorías, comentarios, autoplay y retención del historial.</li>
        </ul>
      </section>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        <Link href="/" className="text-[#3ea6ff] underline-offset-2 hover:underline">
          Volver al inicio
        </Link>
        {" · "}
        <Link
          href="/parental/login"
          className="text-[#3ea6ff] underline-offset-2 hover:underline"
        >
          Panel parental
        </Link>
        {" · "}
        <Link href="/privacy" className="text-[#3ea6ff] underline-offset-2 hover:underline">
          Privacidad
        </Link>
        {" · "}
        <Link href="/contact" className="text-[#3ea6ff] underline-offset-2 hover:underline">
          Contacto
        </Link>
      </p>
    </>
  );
}

export function AboutPageClient() {
  const { locale, setLocale } = useLegalLocale();

  return (
    <article
      className={`mx-auto max-w-lg px-4 py-6 pb-8 text-[var(--yt-text-primary)] lg:max-w-2xl ${MAIN_BOTTOM_PAD}`}
    >
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="mb-2 text-2xl font-semibold">
            {locale === "en" ? "About PekeTube" : "Acerca de PekeTube"}
          </h1>
          <p className="text-sm text-[var(--yt-text-secondary)]">
            {locale === "en"
              ? "A personal project, not affiliated with Google or YouTube."
              : "Un proyecto personal, no oficial de Google ni YouTube."}
          </p>
        </div>
        <LegalLocaleToggle locale={locale} onChange={setLocale} />
      </header>

      <AboutBody locale={locale} />
    </article>
  );
}
