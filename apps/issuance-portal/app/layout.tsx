import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import GlobalOverlays from "./GlobalOverlays";
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
    default: "Eternal Issuance Portal",
    template: "%s | Eternal Issuance Portal",
  },
  description:
    "Issuer, owner-verification, and admin review workflows for Eternal's local asset issuance stack.",
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
          <GlobalOverlays />
          {children}
        </Providers>
      </body>
    </html>
  );
}
