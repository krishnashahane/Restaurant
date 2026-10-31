import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const display = Fraunces({ variable: "--font-display", subsets: ["latin"], axes: ["opsz", "SOFT"] });
const sans = Inter({ variable: "--font-sans", subsets: ["latin"] });

const SITE = "https://krishnaveg.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Krishna Veg · Pure Veg Restaurant, Dehu Road", template: "%s · Krishna Veg" },
  description:
    "Order pure vegetarian food from Krishna Veg, Bapdev Chowk, Kiwale, Dehu Road, Pune. Pav bhaji, paneer, tandoor, Chinese, pizza, combos and more.",
  openGraph: {
    title: "Krishna Veg · Order Online",
    description: "Pure vegetarian kitchen at Dehu Road, Pune. Browse the menu and order in seconds.",
    url: SITE,
    siteName: "Krishna Veg",
    images: [{ url: "/menu/cheese-pav-bhaji.webp", width: 640, height: 640 }],
    locale: "en_IN",
    type: "website",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#14532d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} antialiased`}>
      <body className="min-h-dvh bg-cream text-ink font-sans">{children}</body>
    </html>
  );
}
