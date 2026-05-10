import { Suspense } from "react";
import { ResultsClient } from "./results-client";

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-8 text-sm text-muted-foreground">Cargando…</div>
      }
    >
      <ResultsClient />
    </Suspense>
  );
}
