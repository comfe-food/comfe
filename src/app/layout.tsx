import type { Metadata, Viewport } from "next";
import { Archivo_Black, Open_Sans } from "next/font/google";
import { getStaticConfig } from "@/lib/static-config";
import "./globals.css";

const archivoBlack = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-archivo-black",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-open-sans",
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
  themeColor: "#414770",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-PT"
      className={`${archivoBlack.variable} ${openSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
