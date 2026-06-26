"use client";

import { getSession, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  clearPinAttempts,
  isPinCooldownActive,
  recordPinFailure,
  remainingCooldownMs,
} from "@/lib/parental/attempts";
import {
  hasPinWithRetry,
  isParentalAuthError,
  verifyPin,
} from "@/lib/parental/pin";
import {
  isParentalSessionUnlocked,
  unlockParentalSession,
} from "@/lib/parental/session";
import { devClientLog } from "@/lib/dev/client-log";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ParentalLoginForm() {
  const router = useRouter();
  const { status } = useSession();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
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
        if (!(await hasPinWithRetry(getSession, { recheckIfFalse: true }))) {
          devClientLog("[ParentalPin]", {
            event: "redirect-setup",
            from: "login",
            reason: "hasPin-false-after-recheck",
          });
          willRedirect = true;
          if (alive) setRedirecting(true);
          router.replace("/parental/setup");
          return;
        }
        const sess = await getSession();
        const uid =
          typeof sess?.user?.id === "string" && sess.user.id.length > 0
            ? sess.user.id
            : null;
        if (uid && isParentalSessionUnlocked(uid)) {
          willRedirect = true;
          if (alive) setRedirecting(true);
          router.replace("/parental");
          return;
        }
      } catch (e) {
        if (!alive) return;
        if (isParentalAuthError(e)) {
          setFetchErr(
            "La sesión aún no está lista. Espera un momento y reintenta.",
          );
        } else {
          setFetchErr("No se pudo cargar el estado del PIN.");
        }
      } finally {
        if (alive && !willRedirect) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [router, status]);

  useEffect(() => {
    if (!isPinCooldownActive(Date.now())) {
      setCooldownLeft(0);
      return;
    }
    const id = setInterval(() => {
      const ms = remainingCooldownMs(Date.now());
      setCooldownLeft(Math.ceil(ms / 1000));
      if (ms <= 0) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, [loading]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErr("");
      const now = Date.now();
      if (isPinCooldownActive(now)) {
        setErr(`Espera ${cooldownLeft}s (demasiados intentos fallidos).`);
        return;
      }
      if (!/^\d{4}$/.test(pin)) {
        setErr("El PIN son 4 dígitos.");
        return;
      }
      const ok = await verifyPin(pin);
      if (!ok) {
        recordPinFailure(now);
        setPin("");
        setErr("PIN incorrecto.");
        return;
      }
      clearPinAttempts();
      const sess = await getSession();
      const uid =
        typeof sess?.user?.id === "string" && sess.user.id.length > 0
          ? sess.user.id
          : null;
      if (!uid) {
        setErr("Sesión caducada. Vuelve a iniciar sesión con Google.");
        return;
      }
      await unlockParentalSession(uid);
      router.push("/parental");
    },
    [pin, router, cooldownLeft],
  );

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
      <div className="mx-auto w-full max-w-sm space-y-4 text-center">
        <h1 className="text-xl font-semibold">Panel parental</h1>
        <p className="text-sm text-muted-foreground">
          El PIN se sincroniza con tu cuenta de Google. Inicia sesión para
          continuar.
        </p>
        <Link
          href={`/sign-in?callbackUrl=${encodeURIComponent("/parental/login")}`}
          className={cn(buttonVariants({ variant: "default" }), "w-full")}
        >
          Iniciar sesión con Google
        </Link>
        <Link href="/" className="block text-sm text-primary underline-offset-4 hover:underline">
          Volver al inicio
        </Link>
      </div>
    );
  }

  if (fetchErr) {
    return (
      <div className="mx-auto max-w-sm space-y-3 text-center">
        <p className="text-sm text-destructive">{fetchErr}</p>
        <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm space-y-4">
      <h1 className="text-center text-xl font-semibold">Panel parental</h1>
      <p className="text-center text-sm text-muted-foreground">
        Introduce el PIN de 4 dígitos.
      </p>
      {cooldownLeft > 0 ? (
        <p className="rounded-md bg-destructive/15 px-3 py-2 text-center text-sm text-destructive">
          Demasiados intentos. Espera {cooldownLeft} s.
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          autoComplete="off"
          placeholder="••••"
          className="w-full rounded-lg border border-border bg-background px-3 py-3 text-center text-2xl tracking-[0.5em] text-foreground"
          value={pin}
          onChange={(e) =>
            setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
          }
        />
        {err ? (
          <p className="text-center text-sm text-destructive">{err}</p>
        ) : null}
        <Button type="submit" className="w-full">
          Entrar
        </Button>
      </form>
      <p className="text-center text-xs text-muted-foreground">
        <Link href="/parental/recover" className="underline underline-offset-2">
          Olvidé el PIN
        </Link>
      </p>
      <Link
        href="/"
        className="block text-center text-sm text-primary underline-offset-4 hover:underline"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
