/** Envía logs del cliente al fichero rotativo del servidor. */
export function devClientLog(tag: string, data: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "development") {
    console.info(tag, data);
  }
  void fetch("/api/logs/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tag, data }),
  }).catch(() => {});
}
