import type { Metadata, Viewport } from "next";
import { Manrope, Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "./i18n/LanguageContext";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const notoSerifSC = Noto_Serif_SC({
  variable: "--font-noto-serif-sc",
  weight: ["400", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "China History",
  description: "Explora cómo era un lugar de China en cualquier época.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "China History",
  },
  // app/opengraph-image.png (generado por scripts/generate-app-icons.mjs)
  // se detecta solo por convención de Next.js — esto solo pone el
  // título/descripción que WhatsApp y similares muestran junto a esa imagen.
  openGraph: {
    title: "China History",
    description: "Explora cómo era un lugar de China en cualquier época.",
  },
};

export const viewport: Viewport = {
  themeColor: "#e9e7e2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${notoSerifSC.variable} h-full overflow-hidden overscroll-none antialiased`}
    >
      <body className="h-full flex flex-col overflow-hidden overscroll-none font-sans">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
