import { Flame, Home, Info, Mail, Shield, ShieldCheck, Tv, User, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** Activo en subrutas (p. ej. /parental/*). */
  matchPrefix?: boolean;
};

export const MAIN_NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Inicio", Icon: Home },
  { href: "/shorts", label: "Shorts", Icon: Flame },
  { href: "/subscriptions", label: "Suscripciones", Icon: Tv },
  { href: "/you", label: "Tú", Icon: User },
  { href: "/about", label: "Acerca de", Icon: Info },
  { href: "/privacy", label: "Privacidad", Icon: Shield },
  { href: "/contact", label: "Contacto", Icon: Mail },
] as const;

export const PARENTAL_NAV_ITEM: NavItem = {
  href: "/parental/login",
  label: "Control parental",
  Icon: ShieldCheck,
  matchPrefix: true,
};

export function navItemsForSession(oauthReady: boolean): NavItem[] {
  if (!oauthReady) return [...MAIN_NAV_ITEMS];
  return [
    ...MAIN_NAV_ITEMS.slice(0, 4),
    PARENTAL_NAV_ITEM,
    ...MAIN_NAV_ITEMS.slice(4),
  ];
}

export function isNavActive(pathname: string, item: NavItem): boolean;
export function isNavActive(pathname: string, href: string): boolean;
export function isNavActive(
  pathname: string,
  hrefOrItem: string | NavItem,
): boolean {
  if (typeof hrefOrItem === "string") {
    const href = hrefOrItem;
    return (
      pathname === href || (href !== "/" && pathname.startsWith(`${href}/`))
    );
  }
  const { href, matchPrefix } = hrefOrItem;
  if (matchPrefix) {
    return pathname === href || pathname.startsWith("/parental");
  }
  return (
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`))
  );
}
