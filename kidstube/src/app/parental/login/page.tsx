import Link from "next/link";

/** Placeholder hasta prompt 07 (PIN + flujo real). Long-press en logo → aquí. */
export default function ParentalLoginPlaceholderPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4">
      <h1 className="text-xl font-semibold">Panel parental</h1>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        Aquí irá el acceso con PIN (prompt 07). Vuelve atrás con el botón del
        sistema o enlaces de la app.
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
