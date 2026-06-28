import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
  webpack: (config, { dev }) => {
    // SQLite/logs bajo data/ disparaban Fast Refresh en dev al registrar sesiones.
    if (dev) {
      const prev = config.watchOptions?.ignored;
      const ignored = Array.isArray(prev) ? prev : prev ? [prev] : [];
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          ...ignored,
          "**/data/**",
          "**/*.sqlite",
          "**/*.sqlite-wal",
          "**/*.sqlite-shm",
          "**/*.log",
        ],
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i9.ytimg.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "yt3.ggpht.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "yt3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  /** Sin reglas extra: precache de `/_next/static` y shell; no cachear youtube.com. */
})(nextConfig);
