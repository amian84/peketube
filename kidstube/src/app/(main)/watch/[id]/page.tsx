export default function WatchPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <p className="text-muted-foreground">
        Reproductor — id: {params.id} (prompt 04)
      </p>
    </main>
  );
}
