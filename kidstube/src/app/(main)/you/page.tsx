import { auth } from "@/auth";

export default async function YouPage() {
  const session = await auth();
  const user = session?.user;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
      <p className="text-muted-foreground">Tú</p>
      {user?.name && (
        <p className="text-center text-lg font-medium">{user.name}</p>
      )}
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        OQ-02-004: cerrar sesión solo desde el panel parental (se añadirá en el
        prompt 07).
      </p>
    </main>
  );
}
