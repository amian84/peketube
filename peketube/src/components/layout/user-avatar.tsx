"use client";

import Image from "next/image";
import { useYouTubeAuth } from "@/lib/auth/use-youtube-auth";

/** Avatar de Google solo con OAuth válido (no en modo invitado). */
export function UserAvatar({ compact }: { compact?: boolean }) {
  const { oauthReady, ytReady, session } = useYouTubeAuth();

  if (!ytReady) {
    return (
      <div className="h-8 w-8 shrink-0 rounded-full bg-muted animate-pulse" />
    );
  }

  if (!oauthReady || !session?.user) {
    return null;
  }

  const { user } = session;
  const label = user.name ?? user.email ?? "Cuenta";

  if (compact) {
    return user.image ? (
      <Image
        src={user.image}
        alt=""
        width={32}
        height={32}
        className="shrink-0 rounded-full ring-1 ring-border"
      />
    ) : (
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium ring-1 ring-border"
        aria-label={label}
      >
        {label.slice(0, 1).toUpperCase()}
      </div>
    );
  }

  return (
    <div className="flex max-w-[200px] items-center gap-2">
      {user.image ? (
        <Image
          src={user.image}
          alt=""
          width={32}
          height={32}
          className="shrink-0 rounded-full"
        />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
          {label.slice(0, 1).toUpperCase()}
        </div>
      )}
      <span className="truncate text-sm text-foreground">{label}</span>
    </div>
  );
}
