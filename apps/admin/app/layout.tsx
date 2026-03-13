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
    default: "Eternal Admin",
    template: "%s | Eternal Admin",
  },
  description:
    "Admin review workspace for opening owner documents and approving or rejecting asset verification requests.",
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
