import Link from "next/link";

export function WatchNotAvailable({ reason }: { reason?: string }) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 pb-24 text-center">
      <h1 className="text-lg font-semibold">No disponible</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {reason ??
          "Este vídeo no está disponible en modo solo contenido infantil (OQ-04-005)."}
      </p>
      <Link
        href="/"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
