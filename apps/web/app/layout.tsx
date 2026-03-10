import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import '@solana/wallet-adapter-react-ui/styles.css';
import Providers from "./providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "Eternal",
    template: "%s | Eternal",
  },
  description:
    "Tokenize real-world assets on Solana with fractional ownership, verification, and on-chain transfers.",
  keywords: [
    "asset tokenization",
    "real-world assets",
    "fractional ownership",
    "Solana",
    "RWA",
  ],
  openGraph: {
    title: "Eternal",
    description:
      "A Solana app for registering, verifying, tokenizing, and trading real-world assets.",
    siteName: "Eternal",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Eternal",
    description:
      "A Solana app for registering, verifying, tokenizing, and trading real-world assets.",
  },
  icons: {
    icon: [
      { url: 'favicon.ico', sizes: 'any' },
      { url: 'android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: 'android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <Analytics />
          <Toaster />
          {children}
        </Providers>
      </body>
    </html>
  );
}
