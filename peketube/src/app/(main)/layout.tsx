import { BottomNav } from "@/components/layout/bottom-nav";
import { SideNav } from "@/components/layout/side-nav";
import { TopBar } from "@/components/layout/top-bar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--yt-app-bg)]">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <SideNav />
        <div className="min-w-0 flex-1 pb-[4.5rem] lg:pb-0">{children}</div>
      </div>
      <BottomNav />
    </div>
  );
}
