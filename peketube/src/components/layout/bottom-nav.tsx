"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive, navItemsForSession } from "@/components/layout/nav-items";
import { useYouTubeAuth } from "@/lib/auth/use-youtube-auth";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const { oauthReady } = useYouTubeAuth();
  const items = navItemsForSession(oauthReady);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--yt-border)] bg-[var(--yt-app-bg-translucent)] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur supports-[backdrop-filter]:bg-[var(--yt-app-bg-blur)] lg:hidden"
      aria-label="Principal"
    >
      <div className="mx-auto flex max-w-lg items-end justify-around px-0.5">
        {items.map((item) => {
          const { href, label, Icon } = item;
          const active = isNavActive(pathname, item);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-[48px] flex-col items-center gap-0.5 py-1 text-[8px] sm:text-[9px]",
                active
                  ? "text-[var(--yt-text-primary)]"
                  : "text-[var(--yt-text-secondary)]",
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={active ? 2.25 : 1.75} />
              <span className="max-w-[3.75rem] truncate text-center leading-tight">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
