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
      <h1 className="text-2xl font-semibold">KidsTube</h1>
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
      {!googleOAuthReady ? (
        <div className="max-w-md rounded-lg border border-amber-600/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
          <p className="font-medium text-amber-50">Falta configurar Google OAuth</p>
          <p className="mt-2 text-amber-100/90">
            En el archivo{" "}
            <code className="rounded bg-black/30 px-1 py-0.5 text-xs">
              kidstube/.env.local
            </code>{" "}
            debes definir valores reales (no vacíos) para:
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
      <Link
        href={callbackUrl.startsWith("/sign-in") ? "/" : callbackUrl}
        className={cn(buttonVariants({ variant: "outline" }), "min-w-[220px]")}
      >
        Continuar como invitado
      </Link>
    </main>
  );
}
