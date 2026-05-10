"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { Button } from "@/components/ui/button";

function SignInForm() {
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
      <Button
        onClick={() => signIn("google", { callbackUrl })}
        className="min-w-[220px]"
      >
        Continuar con Google
      </Button>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center">
          <p className="text-muted-foreground">Cargando…</p>
        </main>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
