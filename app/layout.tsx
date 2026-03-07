import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SWRegister from "./sw-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Algo Pocket",
  description: "Mobile-friendly algorithm and system design flashcards",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Algo Pocket",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SWRegister />
        {children}
      </body>
    </html>
  );
}
