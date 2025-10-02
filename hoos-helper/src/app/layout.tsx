import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Hoo's Helper - UVA Course Planning Assistant",
  description: "AI-powered course planning assistant for University of Virginia students. Get personalized four-year academic plans based on your major, focus area, and preferences.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased relative overflow-hidden`}
      >
        {/* Animated Background Blobs */}
        <div className="absolute inset-0 -z-10">
          <div className="blob bg-orange-500 opacity-70"></div>
          <div className="blob bg-blue-900 opacity-50"></div>
          <div className="blob bg-dark-blue opacity-70"></div>
          <div className="blob bg-dark-blue opacity-50"></div>
        </div>
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}
