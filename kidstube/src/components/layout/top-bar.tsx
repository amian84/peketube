"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useLongPress } from "@/hooks/use-long-press";
import { NotificationsPopover } from "@/components/layout/notifications-popover";
import { UserAvatar } from "@/components/layout/user-avatar";
import { YoutubeLogo } from "@/components/layout/youtube-logo";
import { Button } from "@/components/ui/button";

export function TopBar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const skipHomeNavRef = useRef(false);

  const goParental = useCallback(() => {
    skipHomeNavRef.current = true;
    router.push("/parental/login");
  }, [router]);

  const longPress = useLongPress({
    ms: 5000,
    vibrateAtMs: 4000,
    onLongPress: goParental,
  });

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      router.push("/results");
      return;
    }
    router.push(`/results?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#272727] bg-[#0f0f0f]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0f0f0f]/80">
      <div className="flex h-12 items-center gap-2 px-2 sm:h-14 sm:px-3">
        <Link
          href="/"
          className="shrink-0 touch-manipulation rounded-md p-1 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Inicio (mantén pulsado 5 s para panel parental)"
          onClick={(e) => {
            if (skipHomeNavRef.current) {
              e.preventDefault();
              skipHomeNavRef.current = false;
            }
          }}
          {...longPress}
        >
          <YoutubeLogo className="h-5 w-auto sm:h-6" />
        </Link>

        <form
          onSubmit={onSearchSubmit}
          className="flex min-w-0 flex-1 items-center gap-1 rounded-full bg-[#1f1f1f] px-2 py-1 sm:px-3"
        >
          <Search className="h-4 w-4 shrink-0 text-[#aaa]" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar"
            className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 text-sm text-foreground outline-none placeholder:text-[#888]"
            aria-label="Buscar"
          />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            className="hidden h-8 shrink-0 px-2 text-xs text-muted-foreground sm:inline-flex"
          >
            Ir
          </Button>
        </form>

        <NotificationsPopover />

        <Link
          href="/you"
          className="shrink-0 rounded-full pl-1 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Tu cuenta"
        >
          <UserAvatar compact />
        </Link>
      </div>
    </header>
  );
}
