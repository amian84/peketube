"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn } from "lucide-react";
import { UserAvatar } from "@/components/layout/user-avatar";
import { useYouTubeAuth } from "@/lib/auth/use-youtube-auth";
import { cn } from "@/lib/utils";

export function TopBarAccount() {
  const pathname = usePathname();
  const { oauthReady, ytReady } = useYouTubeAuth();
  const callbackUrl = encodeURIComponent(pathname || "/");

  if (!ytReady) {
    return (
      <div
        className="h-8 w-8 shrink-0 rounded-full bg-muted animate-pulse"
        aria-hidden
      />
    );
  }

  if (!oauthReady) {
    return (
      <Link
        href={`/sign-in?callbackUrl=${callbackUrl}`}
        className={cn(
          "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium",
          "bg-[var(--yt-surface-elevated)] text-[var(--yt-text-primary)] ring-1 ring-[var(--yt-avatar-ring)] hover:bg-[var(--yt-surface-hover)]",
        )}
        aria-label="Iniciar sesión con Google"
      >
        <LogIn className="h-4 w-4 shrink-0" aria-hidden />
        <span className="hidden sm:inline">Entrar</span>
      </Link>
    );
  }

  return (
    <Link
      href="/you"
      className="shrink-0 rounded-full pl-1 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Tu cuenta"
    >
      <UserAvatar compact />
    </Link>
  );
}
