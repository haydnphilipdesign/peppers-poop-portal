import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { UserProvider } from "@/lib/user-context";
import "./globals.css";

// Bundle fonts with the app so builds never depend on Google Fonts responses.
const headingFont = localFont({
  src: "./fonts/cormorant-garamond-latin.woff2",
  variable: "--font-heading",
  weight: "400 700",
  style: "normal",
  display: "swap",
  adjustFontFallback: "Times New Roman",
  fallback: ["Georgia", "serif"],
});

const bodyFont = localFont({
  src: "./fonts/source-sans-3-latin.woff2",
  variable: "--font-body",
  weight: "400 700",
  style: "normal",
  display: "swap",
  fallback: ["Segoe UI", "sans-serif"],
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  style: "normal",
  display: "swap",
  fallback: ["monospace"],
});

export const metadata: Metadata = {
  title: "Pepper's Portal",
  description: "Family dashboard for Pepper's walks, routines, and care schedule.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pepper's Portal",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#f7ede1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className={`${headingFont.variable} ${bodyFont.variable} ${geistMono.variable} bg-background text-foreground antialiased`}
      >
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
