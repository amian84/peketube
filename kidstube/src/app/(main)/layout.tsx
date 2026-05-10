import { AppTopBar } from "@/components/layout/app-top-bar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppTopBar />
      <div className="flex-1">{children}</div>
    </div>
  );
}
