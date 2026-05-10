"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type SignInFormProps = {
  googleOAuthReady: boolean;
};

export function SignInForm({ googleOAuthReady }: SignInFormProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  if (status === "authenticated") {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-muted-foreground">Redirigiendo…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">KidsTube</h1>
      <p className="max-w-sm text-center text-muted-foreground">
        Inicia sesión con Google para continuar (OQ-02-001: obligatorio).
      </p>
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
              <code className="text-xs">GOOGLE_CLIENT_ID</code> (Client ID de
              tipo Web en Google Cloud Console)
            </li>
            <li>
              <code className="text-xs">GOOGLE_CLIENT_SECRET</code>
            </li>
          </ul>
          <p className="mt-2 text-xs text-amber-100/80">
            Credenciales → Crear credenciales → ID de cliente OAuth → aplicación
            Web. Orígenes: <code>http://localhost:3000</code>. Redirect:{" "}
            <code>
              http://localhost:3000/api/auth/callback/google
            </code>
            . Luego reinicia <code>pnpm dev</code>.
          </p>
        </div>
      ) : null}
      <Button
        onClick={() => signIn("google", { callbackUrl })}
        className="min-w-[220px]"
        disabled={!googleOAuthReady}
      >
        Continuar con Google
      </Button>
    </main>
  );
}
