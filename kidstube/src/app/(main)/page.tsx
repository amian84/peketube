import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-3xl font-bold tracking-tight">KidsTube</h1>
      <p className="max-w-md text-center text-muted-foreground">
        Placeholder de inicio. La UI tipo YouTube llegará en el prompt 03.
      </p>
      <Button>Probar shadcn</Button>
    </main>
  );
}
