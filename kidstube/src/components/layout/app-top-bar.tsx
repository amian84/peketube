import Link from "next/link";
import { UserAvatar } from "@/components/layout/user-avatar";

export function AppTopBar() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Link href="/" className="text-lg font-bold tracking-tight text-primary">
        KidsTube
      </Link>
      <UserAvatar />
    </header>
  );
}
