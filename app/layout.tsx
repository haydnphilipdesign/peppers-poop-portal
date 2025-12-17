import type { Metadata, Viewport } from "next";
import { Nunito_Sans, Geist_Mono } from "next/font/google";
import { UserProvider } from "@/lib/user-context";
import "./globals.css";

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pepper's Poop Portal",
  description: "Track Pepper's bathroom breaks with gamification and love! 🐕💩",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pepper's Portal",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className={`${nunitoSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
