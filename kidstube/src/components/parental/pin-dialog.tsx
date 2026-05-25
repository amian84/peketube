"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  clearPinAttempts,
  isPinCooldownActive,
  recordPinFailure,
  remainingCooldownMs,
} from "@/lib/parental/attempts";
import { verifyPin } from "@/lib/parental/pin";

export type PinDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tras PIN correcto; si lanza, el diálogo permanece abierto y el padre puede mostrar error. */
  onVerified: () => void | Promise<void>;
  title?: string;
  description?: string;
};

export function PinDialog({
  open,
  onOpenChange,
  onVerified,
  title = "PIN parental",
  description = "Introduce el PIN de 4 dígitos para confirmar.",
}: PinDialogProps) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    if (!open) {
      setPin("");
      setErr("");
      setBusy(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  const submit = useCallback(
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
      setBusy(true);
      try {
        const ok = await verifyPin(pin);
        if (!ok) {
          recordPinFailure(now);
          setPin("");
          setErr("PIN incorrecto.");
          return;
        }
        clearPinAttempts();
        setPin("");
        await onVerified();
        onOpenChange(false);
      } finally {
        setBusy(false);
      }
    },
    [pin, onVerified, onOpenChange, cooldownLeft],
  );

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={() => !busy && onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pin-dialog-title"
        className="w-full max-w-sm rounded-t-xl border border-border bg-background p-4 shadow-lg sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="pin-dialog-title" className="text-center text-base font-semibold">
          {title}
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">{description}</p>
        {cooldownLeft > 0 ? (
          <p className="mt-2 text-center text-sm text-destructive">
            Demasiados intentos. Espera {cooldownLeft} s.
          </p>
        ) : null}
        <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            autoComplete="off"
            placeholder="••••"
            className="w-full rounded-lg border border-border bg-background px-3 py-3 text-center text-2xl tracking-[0.5em]"
            value={pin}
            onChange={(e) =>
              setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
          />
          {err ? (
            <p className="text-center text-sm text-destructive">{err}</p>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={busy}>
              Confirmar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
