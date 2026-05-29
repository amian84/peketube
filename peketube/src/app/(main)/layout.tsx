import { BottomNav } from "@/components/layout/bottom-nav";
import { TopBar } from "@/components/layout/top-bar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#0f0f0f]">
      <TopBar />
      <div className="flex-1 pb-[4.5rem]">{children}</div>
      <BottomNav />
    </div>
  );
}
