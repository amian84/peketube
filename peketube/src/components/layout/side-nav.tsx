"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive, navItemsForSession } from "@/components/layout/nav-items";
import { useYouTubeAuth } from "@/lib/auth/use-youtube-auth";
import { cn } from "@/lib/utils";

export function SideNav() {
  const pathname = usePathname();
  const { oauthReady } = useYouTubeAuth();
  const items = navItemsForSession(oauthReady);

  return (
    <nav
      className="sticky top-14 z-30 hidden h-[calc(100dvh-3.5rem)] w-[4.5rem] shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-[var(--yt-border)] bg-[var(--yt-app-bg)] py-3 lg:flex xl:w-[15rem] xl:items-stretch xl:px-3"
      aria-label="Principal"
    >
      {items.map((item) => {
        const { href, label, Icon } = item;
        const active = isNavActive(pathname, item);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex w-full flex-col items-center gap-0.5 rounded-xl px-1 py-2.5 text-[10px] transition-colors xl:flex-row xl:gap-4 xl:px-3 xl:py-2 xl:text-sm",
              active
                ? "bg-[var(--yt-chip-bg-hover)] font-medium text-[var(--yt-text-primary)]"
                : "text-[var(--yt-text-secondary)] hover:bg-[var(--yt-chip-bg)] hover:text-[var(--yt-text-primary)]",
            )}
          >
            <Icon
              className="h-6 w-6 shrink-0"
              strokeWidth={active ? 2.25 : 1.75}
            />
            <span className="max-w-[4rem] truncate text-center leading-tight xl:max-w-none xl:text-left">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
