export type FeedEmptyContext = {
  categoryLabel: string;
  strictKidsOnly: boolean;
  guestMode?: boolean;
  quotaExceeded?: boolean;
};

/** Mensaje cuando el feed no devuelve vídeos visibles (OQ-11-001 A). */
export function getFeedEmptyHint(ctx: FeedEmptyContext): string {
  if (ctx.quotaExceeded) {
    return "Cuota de YouTube agotada. Vuelve mañana o conecta tu cuenta de Google.";
  }
  if (ctx.guestMode) {
    return "Modo invitado sin resultados. Prueba otra categoría o conecta Google.";
  }
  if (ctx.strictKidsOnly) {
    return `En «${ctx.categoryLabel}» no hay resultados infantiles ahora mismo. Prueba otra pestaña o desactiva «Solo contenido infantil» en el panel parental.`;
  }
  return `No hay vídeos visibles en «${ctx.categoryLabel}» (lista negra o filtros activos).`;
}
