import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { getStaticConfig } from "@/lib/static-config";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const SITE = getStaticConfig();

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: `${SITE.seo.defaultTitle} · ${SITE.seo.brandName}`,
    template: `%s · ${SITE.seo.brandName}`,
  },
  description: SITE.seo.defaultDescription,
  applicationName: SITE.seo.brandName,
  keywords: SITE.seo.keywords,
  openGraph: {
    type: "website",
    locale: "pt_PT",
    siteName: SITE.seo.brandName,
    title: `${SITE.seo.defaultTitle} · ${SITE.seo.brandName}`,
    description: SITE.seo.defaultDescription,
  },
  twitter: {
    card: "summary",
    title: `${SITE.seo.defaultTitle} · ${SITE.seo.brandName}`,
    description: SITE.seo.defaultDescription,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f7f3ea",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-PT"
      className={`${fraunces.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
