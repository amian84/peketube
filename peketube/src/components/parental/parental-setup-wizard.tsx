"use client";

import { getSession, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createParentalPinWithRecovery,
  generateRecoveryPhrase,
  hasPinWithRetry,
  isParentalAuthError,
  normalizeRecoveryPhrase,
} from "@/lib/parental/pin";
import { devClientLog } from "@/lib/dev/client-log";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ParentalSetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [phrase, setPhrase] = useState("");
  const [phraseConfirm, setPhraseConfirm] = useState("");
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  const startPhrase = () => {
    setErr("");
    if (!/^\d{4}$/.test(pin) || pin !== pin2) {
      setErr("Los PIN deben coincidir y tener 4 dígitos.");
      return;
    }
    setPhrase(generateRecoveryPhrase());
    setStep(1);
  };

  const finish = async () => {
    setErr("");
    if (!saved) {
      setErr("Confirma que has guardado la frase.");
      return;
    }
    const a = normalizeRecoveryPhrase(phrase);
    const b = normalizeRecoveryPhrase(phraseConfirm);
    if (a.length < 8 || a !== b) {
      setErr("Repite la frase exactamente en el segundo campo.");
      return;
    }
    try {
      await createParentalPinWithRecovery(pin, phrase);
      devClientLog("[ParentalPin]", { event: "create-put-ok" });
      const persisted = await hasPinWithRetry(getSession, { recheckIfFalse: true });
      if (!persisted) {
        devClientLog("[ParentalPin]", {
          event: "create-verify-failed",
          reason: "hasPin-false-after-put",
        });
        setErr(
          "No se pudo confirmar el PIN en el servidor. Si usas Docker, comprueba que el volumen /data persiste (PEKETUBE_SERVER_DB_PATH).",
        );
        return;
      }
      router.replace("/parental/login");
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (code === "AUTH_REQUIRED") {
        setErr("Sesión caducada. Inicia sesión con Google y vuelve a intentarlo.");
      } else if (code === "SERVER_STORAGE") {
        setErr(
          "No se pudo escribir en la base de datos del servidor. Revisa permisos de /data en el contenedor.",
        );
      } else {
        setErr("No se pudo guardar. Intenta de nuevo.");
      }
    }
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-4 px-2">
      <h1 className="text-center text-xl font-semibold">Configurar PIN</h1>
      <p className="text-center text-xs text-muted-foreground">
        Se guarda en el servidor con tu cuenta Google. Si ya lo configuraste y
        vuelves a ver esta pantalla, puede que la base de datos del contenedor
        no tenga volumen persistente en <code className="text-[11px]">/data</code>.
      </p>
      {step === 0 ? (
        <>
          <p className="text-center text-sm text-muted-foreground">
            Elige un PIN de 4 dígitos y repítelo.
          </p>
          <div className="space-y-2">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="PIN"
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
              placeholder="Repetir PIN"
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
              value={pin2}
              onChange={(e) =>
                setPin2(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
            />
          </div>
          {err ? <p className="text-sm text-destructive">{err}</p> : null}
          <Button type="button" className="w-full" onClick={startPhrase}>
            Continuar
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Frase de recuperación</strong>{" "}
            (guárdala en un sitio seguro). La necesitarás si olvidas el PIN.
          </p>
          <p className="rounded-lg bg-muted p-3 font-mono text-sm leading-relaxed">
            {phrase}
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={saved}
              onChange={(e) => setSaved(e.target.checked)}
            />
            He guardado esta frase en un lugar seguro.
          </label>
          <p className="text-xs text-muted-foreground">
            Escribe la misma frase abajo para confirmar.
          </p>
          <textarea
            className="min-h-[4rem] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={phraseConfirm}
            onChange={(e) => setPhraseConfirm(e.target.value)}
            placeholder="Pega o escribe la frase…"
          />
          {err ? <p className="text-sm text-destructive">{err}</p> : null}
          <Button type="button" variant="secondary" onClick={() => setStep(0)}>
            Atrás
          </Button>
          <Button type="button" className="w-full" onClick={() => void finish()}>
            Guardar y terminar
          </Button>
        </>
      )}
      <Link href="/" className="block text-center text-sm text-primary underline">
        Volver al inicio
      </Link>
    </div>
  );
}

export function ParentalSetupGate() {
  const router = useRouter();
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [fetchErr, setFetchErr] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      setLoading(false);
      return;
    }
    let alive = true;
    void (async () => {
      let willRedirect = false;
      try {
        if (await hasPinWithRetry(getSession, { recheckIfFalse: true })) {
          devClientLog("[ParentalPin]", {
            event: "redirect-login",
            from: "setup-gate",
            reason: "hasPin-true",
          });
          willRedirect = true;
          if (alive) setRedirecting(true);
          if (alive) router.replace("/parental/login");
        } else {
          devClientLog("[ParentalPin]", {
            event: "show-setup-wizard",
            from: "setup-gate",
            reason: "hasPin-false",
          });
        }
      } catch (e) {
        if (!alive) return;
        if (isParentalAuthError(e)) {
          setFetchErr(
            "La sesión aún no está lista. Espera un momento y reintenta.",
          );
        } else {
          setFetchErr("No se pudo comprobar el PIN. Revisa la red.");
        }
      } finally {
        if (alive && !willRedirect) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [status, router]);

  if (
    status === "loading" ||
    redirecting ||
    (status === "authenticated" && loading)
  ) {
    return (
      <p className="text-center text-sm text-muted-foreground">Cargando…</p>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto w-full max-w-md space-y-4 px-2 text-center">
        <h1 className="text-xl font-semibold">Configurar PIN</h1>
        <p className="text-sm text-muted-foreground">
          El PIN parental se guarda en el servidor vinculado a tu cuenta de
          Google (mismo almacén que la lista de bloqueos). Inicia sesión para
          continuar.
        </p>
        <Link
          href={`/sign-in?callbackUrl=${encodeURIComponent("/parental/setup")}`}
          className={cn(buttonVariants({ variant: "default" }), "w-full")}
        >
          Iniciar sesión con Google
        </Link>
        <Link href="/" className="block text-sm text-primary underline">
          Volver al inicio
        </Link>
      </div>
    );
  }

  if (fetchErr) {
    return (
      <div className="mx-auto max-w-md space-y-3 px-2 text-center">
        <p className="text-sm text-destructive">{fetchErr}</p>
        <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return <ParentalSetupWizard />;
}
