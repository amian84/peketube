"use client";

import { SessionProvider } from "next-auth/react";
import { SessionGuard } from "@/components/providers/session-guard";

/** Renueva el JWT (y el access_token de YouTube) antes de que caduque (~1 h). */
const SESSION_REFETCH_SEC = 4 * 60;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={SESSION_REFETCH_SEC}
      refetchOnWindowFocus={false}
    >
      <SessionGuard>{children}</SessionGuard>
    </SessionProvider>
  );
}
