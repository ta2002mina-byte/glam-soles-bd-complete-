import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartProvider } from "@/components/providers/cart-provider";
import { WishlistProvider } from "@/components/providers/wishlist-provider";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { SiteChrome } from "@/components/layout/site-chrome";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site-config";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Step Into Your Best Vibe`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Step Into Your Best Vibe`,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Step Into Your Best Vibe`,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-ivory text-charcoal">
        <CartProvider>
          <WishlistProvider>
            <SiteChrome
              announcementBar={<AnnouncementBar />}
              header={<Header />}
              footer={<Footer />}
              cartDrawer={<CartDrawer />}
            >
              {children}
            </SiteChrome>
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
