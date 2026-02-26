import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://x402.llmer.com"),
  title: "x402 demo · Base Sepolia",
  description:
    "Interactive demo of the HTTP 402 Payment Required protocol on Base Sepolia. Pay-per-request APIs with USDC.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "x402 demo · Base Sepolia",
    description:
      "Interactive demo of the HTTP 402 Payment Required protocol on Base Sepolia. Pay-per-request APIs with USDC.",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://x402.llmer.com",
    siteName: "x402 demo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "x402 demo · Base Sepolia",
    description:
      "Interactive demo of the HTTP 402 Payment Required protocol on Base Sepolia. Pay-per-request APIs with USDC.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
