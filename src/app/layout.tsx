import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "zerogochi",
  description: "8-bit tamagotchi on 0G",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
