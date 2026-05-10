"use client";

import Link from "next/link";
import { ParentalBlacklistTools } from "@/components/parental/parental-blacklist-tools";

export function ParentalLoginClient() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <h1 className="text-xl font-semibold">Panel parental</h1>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        Aquí irá el acceso con PIN (prompt 07). Vuelve atrás con el botón del
        sistema o enlaces de la app.
      </p>
      <ParentalBlacklistTools />
      <Link
        href="/"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
