"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { normalizeRecoveryPhrase, verifyRecoveryPhrase } from "@/lib/parental/pin";
import {
  setRecoveryGateOk,
  setRecoveryPhraseOneShot,
} from "@/lib/parental/recovery-gate";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ParentalRecoverForm() {
  const router = useRouter();
  const { status } = useSession();
  const [phrase, setPhrase] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (status !== "authenticated") {
      setErr("Inicia sesión con Google para recuperar el PIN.");
      return;
    }
    const ok = await verifyRecoveryPhrase(phrase);
    if (!ok) {
      setErr("Frase incorrecta.");
      return;
    }
    setRecoveryPhraseOneShot(normalizeRecoveryPhrase(phrase));
    setRecoveryGateOk();
    router.push("/parental/reset-pin");
  };

  if (status === "loading") {
    return (
      <p className="text-center text-sm text-muted-foreground">Cargando…</p>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto w-full max-w-sm space-y-4 text-center">
        <h1 className="text-xl font-semibold">Recuperar acceso</h1>
        <p className="text-sm text-muted-foreground">
          Inicia sesión con la misma cuenta de Google donde configuraste el PIN.
        </p>
        <Link
          href={`/sign-in?callbackUrl=${encodeURIComponent("/parental/recover")}`}
          className={cn(buttonVariants({ variant: "default" }), "w-full")}
        >
          Iniciar sesión con Google
        </Link>
        <Link href="/parental/login" className="block text-center text-sm underline">
          Volver al login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-sm space-y-3">
      <h1 className="text-xl font-semibold">Recuperar acceso</h1>
      <p className="text-sm text-muted-foreground">
        Introduce la frase de recuperación que guardaste al crear el PIN.
      </p>
      <textarea
        required
        className="min-h-[5rem] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
      />
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      <Button type="submit" className="w-full">
        Continuar
      </Button>
      <Link href="/parental/login" className="block text-center text-sm underline">
        Volver al login
      </Link>
    </form>
  );
}
