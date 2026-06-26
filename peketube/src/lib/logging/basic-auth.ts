/** @deprecated Usar `@/lib/admin-viewer/basic-auth`. */
export {
  adminViewerUnauthorizedResponse as logsUnauthorizedResponse,
  isAdminViewerAuthorized as isLogsViewerAuthorized,
  parseBasicAuthHeader,
  ADMIN_VIEWER_REALM as LOGS_BASIC_AUTH_REALM,
} from "@/lib/admin-viewer/basic-auth";
