import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import { NavProgress } from "@/components/NavProgress";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "AllTails Insights",
  description: "User growth and funnel dashboard for AllTails Care",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Suspense>
          <NavProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
