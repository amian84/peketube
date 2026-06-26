/** Credenciales del visor admin — solo env (compatible con Edge / middleware). */

export function isAdminViewerEnabled(): boolean {
  const user = process.env.LOG_VIEWER_USER?.trim();
  const pass = process.env.LOG_VIEWER_PASS;
  return Boolean(user && pass && pass.length > 0);
}

export function adminViewerCredentials(): { user: string; pass: string } | null {
  if (!isAdminViewerEnabled()) return null;
  return {
    user: process.env.LOG_VIEWER_USER!.trim(),
    pass: process.env.LOG_VIEWER_PASS!,
  };
}

/** @deprecated Usar `isAdminViewerEnabled`. */
export const isLogsViewerEnabled = isAdminViewerEnabled;

/** @deprecated Usar `adminViewerCredentials`. */
export const logsViewerCredentials = adminViewerCredentials;
