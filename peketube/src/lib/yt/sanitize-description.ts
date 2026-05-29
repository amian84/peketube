/** Descripción sin HTML ni enlaces clicables (OQ-11-006). */
export function sanitizeVideoDescription(raw: string): string {
  let t = raw.replace(/<[^>]*>/g, "");
  t = t.replace(/\r\n/g, "\n");
  return t.trim();
}
