"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";

export function YouPageClient() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const label = user?.name ?? user?.email ?? "Cuenta";

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 px-4 pb-24 pt-6">
      <div className="relative h-24 w-24 overflow-hidden rounded-full bg-muted ring-2 ring-border">
        {user?.image ? (
          <Image src={user.image} alt="" fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl font-semibold">
            {label.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <p className="text-center text-lg font-medium">{label}</p>

      <div className="w-full max-w-sm space-y-2">
        <Link
          href="/you#historial"
          className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50"
        >
          Historial
          <span className="text-xs text-muted-foreground">Próx. prompt 05</span>
        </Link>
        <div className="flex w-full items-center justify-between rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          Tus vídeos
          <span className="text-xs">Próximamente</span>
        </div>
      </div>

      <p className="max-w-sm text-center text-xs text-muted-foreground">
        Cerrar sesión: solo desde el panel parental (OQ-02-004, prompt 07).
      </p>
    </div>
  );
}
