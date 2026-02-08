import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Source_Sans_3, Geist_Mono } from "next/font/google";
import { UserProvider } from "@/lib/user-context";
import "./globals.css";

const headingFont = Cormorant_Garamond({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const bodyFont = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
