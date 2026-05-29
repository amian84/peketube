/** En `pnpm dev`, envía logs del cliente a la terminal del servidor. */
export function devClientLog(tag: string, data: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "development") {
    console.info(tag, data);
  }
  if (process.env.NODE_ENV !== "development") return;
  void fetch("/api/dev/client-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tag, data }),
  }).catch(() => {});
}
