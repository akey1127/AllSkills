import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteNav } from "@/components/SiteNav";
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
  title: "All-Skills — trades-first creators",
  description:
    "Subscriptions, PPV, tips, forums, and live streams for blue-collar personalities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full bg-zinc-50 antialiased text-zinc-900`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
