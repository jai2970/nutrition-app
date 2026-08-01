import type { Metadata } from "next";
import Link from "next/link";
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
  title: "Nutrition Tracker",
  description: "Track your food, calories, and macros.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="border-b border-black/[.08] dark:border-white/[.145]">
          <div className="max-w-3xl mx-auto flex items-center gap-6 px-6 h-14 text-sm font-medium">
            <span className="font-semibold">Nutrition Tracker</span>
            <Link href="/dashboard" className="hover:opacity-70">
              Dashboard
            </Link>
            <Link href="/log" className="hover:opacity-70">
              Food Log
            </Link>
            <Link href="/profile" className="hover:opacity-70">
              Profile
            </Link>
          </div>
        </nav>
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
