import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

/** Env del contenedor (Docker/TrueNAS); no usar valor fijado en `next build`. */
export const dynamic = "force-dynamic";

export default function SignInPage() {
  const googleOAuthReady =
    Boolean(process.env.GOOGLE_CLIENT_ID?.trim()) &&
    Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim());

  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center">
          <p className="text-muted-foreground">Cargando…</p>
        </main>
      }
    >
      <SignInForm googleOAuthReady={googleOAuthReady} />
    </Suspense>
  );
}
