"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  isParentalSessionUnlocked,
  lockParentalSession,
  touchParentalSession,
} from "@/lib/parental/session";
import { Button } from "@/components/ui/button";

export default function ParentalProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isParentalSessionUnlocked(Date.now())) {
      router.replace("/parental/login");
      return;
    }
    void touchParentalSession().then(() => setReady(true));
  }, [pathname, router]);

  if (!ready) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Cargando panel…</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-background pb-16">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-3 py-2 backdrop-blur">
        <div className="mx-auto flex max-w-lg flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium">
            <Link href="/parental" className="text-primary hover:underline">
              Resumen
            </Link>
            <Link href="/parental/blocked" className="hover:underline">
              Bloqueados
            </Link>
            <Link href="/parental/recent" className="hover:underline">
              Vistos
            </Link>
            <Link href="/parental/settings" className="hover:underline">
              Ajustes
            </Link>
          </nav>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              lockParentalSession();
              router.push("/parental/login");
            }}
          >
            Salir del panel
          </Button>
        </div>
      </header>
      <div className="mx-auto max-w-lg px-3 pt-4">{children}</div>
    </main>
  );
}
