import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { AppleSplashHead } from "@/components/pwa/apple-splash-head";
import { AuthProvider } from "@/components/providers/auth-provider";
import { BlacklistProvider } from "@/components/providers/blacklist-provider";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PekeTube",
  description: "Vídeos infantiles con control parental",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon.ico" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon-180.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PekeTube",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F0F0F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`dark ${roboto.variable}`}>
      <head>
        <AppleSplashHead />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <AuthProvider>
          <BlacklistProvider>{children}</BlacklistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
