import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Backdrop } from "@/components/Backdrop";
import { SiteChrome } from "@/components/SiteChrome";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Skillence — AI Career Advisory",
  description:
    "Discover your top 3 best-fit careers with AI — match %, market demand, salary, skill gaps and a personalized roadmap.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col font-sans">
        <Backdrop />
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
