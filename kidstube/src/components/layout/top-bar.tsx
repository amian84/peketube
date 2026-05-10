"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Bell, Search } from "lucide-react";
import { useLongPress } from "@/hooks/use-long-press";
import { UserAvatar } from "@/components/layout/user-avatar";
import { YoutubeLogo } from "@/components/layout/youtube-logo";
import { Button } from "@/components/ui/button";

export function TopBar() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const goParental = useCallback(() => {
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
        <button
          type="button"
          className="shrink-0 touch-manipulation rounded-md p-1 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Inicio (mantén pulsado para padres)"
          {...longPress}
        >
          <YoutubeLogo className="h-5 w-auto sm:h-6" />
        </button>

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

        <button
          type="button"
          className="hidden shrink-0 rounded-full p-2 text-[#aaa] sm:block"
          aria-label="Notificaciones (decorativo)"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div className="shrink-0 pl-1">
          <UserAvatar compact />
        </div>
      </div>
    </header>
  );
}
