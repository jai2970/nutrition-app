import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import NavLinks from "./NavLinks";
import MobileNav from "./MobileNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
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
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="border-b border-border bg-surface/60">
          <div className="max-w-3xl mx-auto flex items-center gap-6 px-6 h-14 text-sm font-medium">
            <span className="font-heading font-semibold text-primary tracking-tight">
              Nutrition Tracker
            </span>
            <div className="hidden sm:flex items-center gap-6">
              <NavLinks />
            </div>
          </div>
        </nav>
        <div className="flex flex-1 flex-col pb-28 sm:pb-0">{children}</div>
        <MobileNav />
      </body>
    </html>
  );
}
