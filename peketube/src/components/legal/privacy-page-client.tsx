"use client";

import Link from "next/link";
import { LegalLocaleToggle } from "@/components/legal/legal-locale-toggle";
import { useLegalLocale } from "@/components/legal/use-legal-locale";
import { MAIN_BOTTOM_PAD } from "@/lib/layout/responsive";
import type { LegalLocale } from "@/lib/legal/locale";

function PrivacyBody({ locale }: { locale: LegalLocale }) {
  const aboutHref = locale === "en" ? "/about?lang=en" : "/about";

  if (locale === "en") {
    return (
      <>
        <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
          <section className="space-y-2">
            <h2 className="text-base font-medium text-foreground">
              1. Data controller
            </h2>
            <p>
              PekeTube is a personal / family-use software project, not a
              commercial product from Google or YouTube. This instance is
              operated by the administrator of the{" "}
              <strong className="font-medium text-foreground">amian.es</strong>{" "}
              domain. There is no company or commercial support team behind the
              service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-foreground">
              2. What the app does
            </h2>
            <p>
              PekeTube provides a YouTube-like interface with parental controls
              (blocks, PIN, history, settings). You can use it in{" "}
              <strong className="font-medium text-foreground">guest mode</strong>{" "}
              or by connecting your{" "}
              <strong className="font-medium text-foreground">Google account</strong>{" "}
              to access subscriptions and your YouTube API quota.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-foreground">
              3. Data we process
            </h2>
            <ul className="list-inside list-disc space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Google account (optional):</strong>{" "}
                if you sign in, we use Google OAuth to obtain your identifier,
                name, email address, and profile picture, according to standard
                sign-in permissions.
              </li>
              <li>
                <strong className="text-foreground">YouTube (read-only):</strong>{" "}
                with your consent we request the{" "}
                <code className="rounded bg-muted px-1 text-xs">youtube.readonly</code>{" "}
                permission. It is used to show your feed, searches, subscriptions,
                and video metadata. We do not publish, edit, or delete content on
                YouTube on your behalf.
              </li>
              <li>
                <strong className="text-foreground">Browser (local):</strong> on
                this device we store settings, parental block lists, cached watch
                history, local likes, and API response cache in local storage
                (IndexedDB).
              </li>
              <li>
                <strong className="text-foreground">Server (when signed in):</strong>{" "}
                on this instance&apos;s server we may store your parental PIN
                (hashed), synced block lists, and playback history linked to your
                Google account, in a SQLite database on the host machine.
              </li>
              <li>
                <strong className="text-foreground">Guest mode:</strong> searches
                and the feed may use a YouTube API key from the project (shared
                quota), without identifying the user.
              </li>
              <li>
                <strong className="text-foreground">Technical:</strong> the web
                server and reverse proxy may log IP addresses, date, and
                requested URLs depending on hosting configuration (e.g. Caddy /
                TrueNAS). PekeTube does not add its own third-party analytics.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-foreground">
              4. Purpose and legal basis
            </h2>
            <p>
              Data is used solely to provide app functionality (play and list
              videos, parental filters, history, and settings). The legal basis is
              your consent when signing in with Google and, for local data, the
              service you request by using the application.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-foreground">
              5. Disclosure and processors
            </h2>
            <p>
              Account and YouTube data are obtained through{" "}
              <strong className="font-medium text-foreground">Google LLC</strong>{" "}
              (OAuth and YouTube Data API), subject to Google&apos;s policies. We
              do not sell or rent personal data. We do not share data with other
              third parties for commercial purposes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-foreground">
              6. Retention
            </h2>
            <p>
              Local data remains on your device until you delete it (history,
              parental reset, or clearing site data in the browser). Server data
              is kept while your account remains linked; you can request deletion
              from the parental panel (reset area), or stop using the service and
              ask the administrator to remove server data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-foreground">
              7. Children and parental control
            </h2>
            <p>
              PekeTube is intended for family use under adult supervision. The
              parental panel (PIN) limits configuration changes and blocks.
              Videos and comments come from YouTube; the responsible adult should
              configure filters and blocks for the child.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-foreground">
              8. Your rights
            </h2>
            <p>
              You can revoke PekeTube&apos;s access to your Google account at{" "}
              <a
                href="https://myaccount.google.com/permissions"
                className="text-[#3ea6ff] underline-offset-2 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                your Google account → Security → Third-party access
              </a>
              . You can also sign out, clear local browser data, or use deletion
              options in the parental panel. For questions about data on this
              instance&apos;s server, contact the site administrator (see{" "}
              <Link
                href={aboutHref}
                className="text-[#3ea6ff] underline-offset-2 hover:underline"
              >
                About
              </Link>
              ).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-foreground">9. Changes</h2>
            <p>
              This policy may be updated if functionality or legal requirements
              change. The update date appears at the top of this document.
            </p>
          </section>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link href="/" className="text-[#3ea6ff] underline-offset-2 hover:underline">
            Home
          </Link>
          {" · "}
          <Link
            href={aboutHref}
            className="text-[#3ea6ff] underline-offset-2 hover:underline"
          >
            About
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            1. Quién es el responsable
          </h2>
          <p>
            PekeTube es un proyecto personal de software libre / uso familiar,
            no un producto comercial de Google ni YouTube. Esta instancia la
            opera el administrador del dominio{" "}
            <strong className="font-medium text-foreground">amian.es</strong>.
            No hay empresa ni equipo de soporte comercial detrás del servicio.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            2. Qué hace la aplicación
          </h2>
          <p>
            PekeTube ofrece una interfaz similar a YouTube con control parental
            (bloqueos, PIN, historial, ajustes). Puedes usarla en{" "}
            <strong className="font-medium text-foreground">modo invitado</strong>{" "}
            o conectando tu{" "}
            <strong className="font-medium text-foreground">cuenta de Google</strong>{" "}
            para acceder a suscripciones y a tu cuota de la API de YouTube.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            3. Datos que se tratan
          </h2>
          <ul className="list-inside list-disc space-y-2 text-muted-foreground">
            <li>
              <strong className="text-foreground">Cuenta Google (opcional):</strong>{" "}
              si inicias sesión, usamos OAuth de Google para obtener identificador,
              nombre, correo electrónico y foto de perfil, según los permisos
              estándar de inicio de sesión.
            </li>
            <li>
              <strong className="text-foreground">YouTube (solo lectura):</strong>{" "}
              con tu consentimiento pedimos el permiso{" "}
              <code className="rounded bg-muted px-1 text-xs">youtube.readonly</code>
              . Sirve para mostrar feed, búsquedas, suscripciones y metadatos de
              vídeos de tu cuenta. No publicamos, editamos ni borramos contenido
              en YouTube en tu nombre.
            </li>
            <li>
              <strong className="text-foreground">Navegador (local):</strong> en
              este dispositivo se guardan en almacenamiento local (IndexedDB)
              ajustes, listas de bloqueo parental, historial de visionado en
              caché, «me gusta» locales y caché de respuestas de la API.
            </li>
            <li>
              <strong className="text-foreground">Servidor (si hay sesión):</strong>{" "}
              en el servidor de esta instancia puede guardarse PIN parental
              (hash), listas de bloqueo sincronizadas e historial de
              reproducción asociado a tu cuenta Google, en una base de datos
              SQLite en el equipo que aloja la aplicación.
            </li>
            <li>
              <strong className="text-foreground">Modo invitado:</strong> las
              búsquedas y el feed pueden usar una clave de API de YouTube del
              proyecto (cuota compartida), sin identificar al usuario.
            </li>
            <li>
              <strong className="text-foreground">Técnicos:</strong> el servidor
              web y el proxy pueden registrar direcciones IP, fecha y URL
              solicitada según la configuración del alojamiento (p. ej. Caddy /
              TrueNAS). PekeTube no añade analítica de terceros propia.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            4. Finalidad y base legal
          </h2>
          <p>
            Los datos se usan únicamente para prestar la funcionalidad de la app
            (reproducir y listar vídeos, filtros parentales, historial y
            ajustes). La base es tu consentimiento al iniciar sesión con Google
            y, en el caso de datos locales, la ejecución del servicio que
            solicitas al usar la aplicación.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            5. Cesión y encargados
          </h2>
          <p>
            Los datos de cuenta y de YouTube se obtienen a través de{" "}
            <strong className="font-medium text-foreground">Google LLC</strong>{" "}
            (OAuth y YouTube Data API), sujetos a las políticas de Google. No
            vendemos ni alquilamos datos personales. No compartimos datos con
            otros terceros con fines comerciales.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            6. Conservación
          </h2>
          <p>
            Los datos locales permanecen en tu dispositivo hasta que los borres
            (historial, reset parental o borrado de datos del sitio en el
            navegador). En el servidor se conservan mientras mantengas la cuenta
            vinculada; puedes solicitar borrado desde el panel parental (zona de
            reset) o dejando de usar el servicio y pidiendo al administrador
            que elimine los datos del servidor.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            7. Menores y control parental
          </h2>
          <p>
            PekeTube está pensado para uso familiar con supervisión de un adulto.
            El panel parental (PIN) limita cambios de configuración y bloqueos.
            Los vídeos y comentarios provienen de YouTube; el adulto responsable
            debe configurar filtros y bloqueos según el menor.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            8. Tus derechos
          </h2>
          <p>
            Puedes revocar el acceso de PekeTube a tu cuenta Google en{" "}
            <a
              href="https://myaccount.google.com/permissions"
              className="text-[#3ea6ff] underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              tu cuenta de Google → Seguridad → Acceso de terceros
            </a>
            . También puedes cerrar sesión, borrar datos locales del navegador
            o usar las opciones de borrado del panel parental. Para consultas
            sobre datos en el servidor de esta instancia, contacta al
            administrador del sitio (véase{" "}
            <Link
              href="/about"
              className="text-[#3ea6ff] underline-offset-2 hover:underline"
            >
              Acerca de
            </Link>
            ).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">9. Cambios</h2>
          <p>
            Esta política puede actualizarse si cambia la funcionalidad o los
            requisitos legales. La fecha de actualización figura al inicio del
            documento.
          </p>
        </section>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        <Link href="/" className="text-[#3ea6ff] underline-offset-2 hover:underline">
          Inicio
        </Link>
        {" · "}
        <Link href={aboutHref} className="text-[#3ea6ff] underline-offset-2 hover:underline">
          Acerca de
        </Link>
      </p>
    </>
  );
}

export function PrivacyPageClient() {
  const { locale, setLocale } = useLegalLocale();

  return (
    <article
      className={`mx-auto max-w-lg px-4 py-6 pb-8 text-[var(--yt-text-primary)] lg:max-w-2xl ${MAIN_BOTTOM_PAD}`}
    >
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="mb-2 text-2xl font-semibold">
            {locale === "en" ? "Privacy policy" : "Política de privacidad"}
          </h1>
          <p className="text-sm text-[var(--yt-text-secondary)]">
            {locale === "en" ? (
              <>
                Last updated: May 2026 · Applies to this PekeTube instance at{" "}
                <span className="text-foreground">peketube.amian.es</span>
              </>
            ) : (
              <>
                Última actualización: mayo de 2026 · Aplica a esta instalación de
                PekeTube en{" "}
                <span className="text-foreground">peketube.amian.es</span>
              </>
            )}
          </p>
        </div>
        <LegalLocaleToggle locale={locale} onChange={setLocale} />
      </header>

      <PrivacyBody locale={locale} />
    </article>
  );
}
