import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import NavLinks from "./NavLinks";
import MobileNav from "./MobileNav";
import ToastProvider from "./Toaster";

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

const SITE_NAME = "Nutrition Tracker";
const DESCRIPTION =
  "Log meals from a photo or a sentence and see your protein, calories and macros at a glance, with targets personalised to you.";

export const metadata: Metadata = {
  // Absolute base so the generated link-preview image URL resolves correctly.
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://nutrition-app-delta-tawny.vercel.app",
  ),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: "#fbf8f2",
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
        <ToastProvider>
          <nav className="border-b border-border bg-surface/60">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-6 px-6 h-14 text-sm font-medium">
              <Link
                href="/dashboard"
                aria-label="Nutrition Tracker — go to Today"
                className="font-heading font-semibold text-primary tracking-tight hover:opacity-80 transition-opacity"
              >
                Nutrition Tracker
              </Link>
              <div className="hidden sm:flex items-center gap-6">
                <NavLinks />
              </div>
            </div>
          </nav>
          <div className="flex flex-1 flex-col pb-28 sm:pb-0">{children}</div>
          <MobileNav />
        </ToastProvider>
      </body>
    </html>
  );
}
