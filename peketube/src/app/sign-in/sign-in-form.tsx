"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SignInFormProps = {
  googleOAuthReady: boolean;
};

export function SignInForm({ googleOAuthReady }: SignInFormProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const reason = searchParams.get("reason");
  const { data: session, status } = useSession();
  const [clearing, setClearing] = useState(false);

  const sessionExpired =
    session?.error === "RefreshAccessTokenError" || reason === "session_expired";

  useEffect(() => {
    if (status !== "authenticated") return;
    if (sessionExpired) {
      setClearing(true);
      void signOut({ redirect: false }).then(() => {
        setClearing(false);
        const dest =
          callbackUrl.startsWith("/sign-in") || !callbackUrl.startsWith("/")
            ? "/"
            : callbackUrl;
        router.replace(dest);
      });
      return;
    }
    router.replace(callbackUrl);
  }, [status, sessionExpired, router, callbackUrl]);

  const handleGoogleSignIn = () => {
    void signIn(
      "google",
      { callbackUrl },
      sessionExpired
        ? { prompt: "consent", access_type: "offline" }
        : { access_type: "offline" },
    );
  };

  if (status === "loading" || clearing) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-muted-foreground">Cargando…</p>
      </main>
    );
  }

  if (status === "authenticated" && !sessionExpired) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-muted-foreground">Redirigiendo…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">PekeTube</h1>
      {sessionExpired ? (
        <p className="max-w-sm text-center text-muted-foreground">
          Tu acceso personal a YouTube ha caducado. Puedes seguir en modo invitado
          o volver a conectar con Google para suscripciones y tu cuota.
        </p>
      ) : (
        <p className="max-w-sm text-center text-muted-foreground">
          Inicia sesión con Google para suscripciones y tu cuota, o continúa como
          invitado.
        </p>
      )}
      {googleOAuthReady ? (
        <div className="max-w-md space-y-2 rounded-lg border border-[var(--yt-border)] bg-[var(--yt-surface)] px-4 py-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            ¿Google dice que la app no está verificada?
          </p>
          <p>
            PekeTube es un proyecto personal. Google muestra ese aviso porque
            pedimos acceso de solo lectura a YouTube; la verificación oficial
            está <strong className="text-foreground">en proceso</strong>, pero
            Google tarda su tiempo en completarla. Mientras tanto puedes seguir
            sin problema:
          </p>
          <ol className="list-inside list-decimal space-y-1 text-left">
            <li>
              En la pantalla de Google, pulsa{" "}
              <strong className="text-foreground">Configuración avanzada</strong>.
            </li>
            <li>
              Pulsa{" "}
              <strong className="text-foreground">Ir a PekeTube (no seguro)</strong>{" "}
              (o el texto equivalente).
            </li>
            <li>Confirma los permisos y volverás a PekeTube.</li>
          </ol>
        </div>
      ) : null}
      {!googleOAuthReady ? (
        <div className="max-w-md rounded-lg border border-amber-600/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
          <p className="font-medium text-amber-50">Falta configurar Google OAuth</p>
          <p className="mt-2 text-amber-100/90">
            En el servidor (variables de entorno del contenedor o{" "}
            <code className="rounded bg-black/30 px-1 py-0.5 text-xs">
              peketube/.env.local
            </code>{" "}
            en desarrollo) debes definir valores reales (no vacíos) para:
          </p>
          <ul className="mt-2 list-inside list-disc text-amber-100/90">
            <li>
              <code className="text-xs">GOOGLE_CLIENT_ID</code>
            </li>
            <li>
              <code className="text-xs">GOOGLE_CLIENT_SECRET</code>
            </li>
          </ul>
        </div>
      ) : null}
      <Button
        onClick={handleGoogleSignIn}
        className="min-w-[220px]"
        disabled={!googleOAuthReady}
      >
        {sessionExpired ? "Volver a conectar con Google" : "Continuar con Google"}
      </Button>
      <p className="max-w-sm text-center text-xs text-muted-foreground">
        <Link
          href="/privacy"
          className="text-[#3ea6ff] underline-offset-2 hover:underline"
        >
          Política de privacidad
        </Link>
      </p>
      <Link
        href={callbackUrl.startsWith("/sign-in") ? "/" : callbackUrl}
        className={cn(buttonVariants({ variant: "outline" }), "min-w-[220px]")}
      >
        Continuar como invitado
      </Link>
    </main>
  );
}
