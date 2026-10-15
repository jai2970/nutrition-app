import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import { TopBar, Body } from "./AppChrome";
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

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const SITE_NAME = "Macroly";
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
  themeColor: "#f5f0e8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <TopBar />
          <Body>{children}</Body>
          <MobileNav />
        </ToastProvider>
      </body>
    </html>
  );
}
