import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    error?: "RefreshAccessTokenError";
    user: DefaultSession["user"] & {
      /** Google OAuth `sub` — clave estable en SQLite (PIN, blacklist). */
      id?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    access_token?: string;
    refresh_token?: string;
    /** Unix seconds */
    expires_at?: number;
    error?: "RefreshAccessTokenError";
  }
}
