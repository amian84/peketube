"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resetParentalPinWithRecoveryPhrase } from "@/lib/parental/pin";
import {
  clearRecoveryGate,
  clearRecoveryPhraseOneShot,
  isRecoveryGateOk,
  readRecoveryPhraseOneShot,
} from "@/lib/parental/recovery-gate";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ParentalResetPinForm() {
  const router = useRouter();
  const { status } = useSession();
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!isRecoveryGateOk()) {
      router.replace("/parental/recover");
    }
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (status !== "authenticated") {
      setErr("Inicia sesión con Google.");
      return;
    }
    if (!/^\d{4}$/.test(pin) || pin !== pin2) {
      setErr("PIN inválido o no coincide.");
      return;
    }
    const phrase = readRecoveryPhraseOneShot();
    if (!phrase) {
      setErr("La sesión de recuperación expiró. Vuelve a introducir la frase.");
      router.replace("/parental/recover");
      return;
    }
    const result = await resetParentalPinWithRecoveryPhrase(pin, phrase);
    if (result === "RECOVERY_WRONG") {
      setErr("La frase ya no coincide. Vuelve a recuperar el acceso.");
      clearRecoveryPhraseOneShot();
      clearRecoveryGate();
      router.replace("/parental/recover");
      return;
    }
    if (result === "AUTH_REQUIRED") {
      setErr("Sesión caducada. Inicia sesión de nuevo.");
      return;
    }
    if (result !== "ok") {
      setErr("No se pudo guardar.");
      return;
    }
    clearRecoveryPhraseOneShot();
    clearRecoveryGate();
    router.replace("/parental/login");
  };

  if (status === "loading") {
    return (
      <p className="text-center text-sm text-muted-foreground">Cargando…</p>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto w-full max-w-sm space-y-4 text-center">
        <h1 className="text-xl font-semibold">Nuevo PIN</h1>
        <p className="text-sm text-muted-foreground">
          Inicia sesión para guardar el nuevo PIN en el servidor.
        </p>
        <Link
          href={`/sign-in?callbackUrl=${encodeURIComponent("/parental/reset-pin")}`}
          className={cn(buttonVariants({ variant: "default" }), "w-full")}
        >
          Iniciar sesión con Google
        </Link>
        <Link href="/parental/recover" className="block text-sm underline">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-sm space-y-3">
      <h1 className="text-xl font-semibold">Nuevo PIN</h1>
      <p className="text-sm text-muted-foreground">
        Define un PIN nuevo de 4 dígitos.
      </p>
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        className="w-full rounded-lg border border-border bg-background px-3 py-2"
        value={pin}
        onChange={(e) =>
          setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
        }
      />
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        className="w-full rounded-lg border border-border bg-background px-3 py-2"
        value={pin2}
        onChange={(e) =>
          setPin2(e.target.value.replace(/\D/g, "").slice(0, 4))
        }
      />
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      <Button type="submit" className="w-full">
        Guardar PIN
      </Button>
      <Link href="/parental/login" className="block text-center text-sm underline">
        Cancelar
      </Link>
    </form>
  );
}
