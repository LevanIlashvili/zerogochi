import type { Metadata } from "next";
import Script from "next/script";
import { Press_Start_2P, Silkscreen } from "next/font/google";
import "./globals.css";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

// Used for prose / dialogue — Silkscreen is a bitmap-style pixel font
// designed for small-size legibility while staying in the 8-bit aesthetic.
// Press Start 2P stays for chrome (buttons, labels, headers).
const silkscreen = Silkscreen({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel-prose",
  display: "swap",
});

export const metadata: Metadata = {
  title: "zerogochi",
  description: "8-bit tamagotchi on 0G",
};

// Disable iOS pinch + double-tap zoom (Telegram WebView is fixed-layout) and
// extend behind safe areas so the device chrome doesn't clip on notched phones.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pressStart.variable} ${silkscreen.variable}`}>
      <body>
        {/* Telegram Mini Apps SDK — populates window.Telegram.WebApp with
            initData, CloudStorage, and theme params. Required for the
            mini-app to work inside Telegram; harmless on regular browsers. */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
