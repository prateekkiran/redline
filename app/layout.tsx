import type { Metadata } from "next";
import { Archivo, Cardo } from "next/font/google";
import "./globals.css";

// Cardo was drawn for scholarly critical editions, the world this page is
// set in. Archivo carries controls and small labels.
const cardo = Cardo({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-cardo",
});

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  title: "Redline: read your contract before you sign it",
  description:
    "Redline reads a freelance contract and quotes back every sentence that reaches too far, with a counter-offer for each. Free while in early access.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cardo.variable} ${archivo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
