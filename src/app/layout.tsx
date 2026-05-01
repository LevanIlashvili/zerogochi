import type { Metadata } from "next";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pressStart.variable} ${silkscreen.variable}`}>
      <body>{children}</body>
    </html>
  );
}
