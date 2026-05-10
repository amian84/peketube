"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Home, Tv, User } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Inicio", Icon: Home },
  { href: "/shorts", label: "Shorts", Icon: Flame },
  { href: "/subscriptions", label: "Suscripciones", Icon: Tv },
  { href: "/you", label: "Tú", Icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#272727] bg-[#0f0f0f]/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur supports-[backdrop-filter]:bg-[#0f0f0f]/80"
      aria-label="Principal"
    >
      <div className="mx-auto flex max-w-lg items-end justify-around px-1">
        {nav.map(({ href, label, Icon }) => {
          const active =
            pathname === href ||
            (href !== "/" && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-[56px] flex-col items-center gap-0.5 py-1 text-[10px]",
                active ? "text-white" : "text-[#aaa]",
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={active ? 2.25 : 1.75} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
