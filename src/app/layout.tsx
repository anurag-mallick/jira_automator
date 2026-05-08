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
  title: "IT Project Management Tool",
  description: "Internal IT and External Ticket Management",
};

import { AuthProvider } from "@/context/AuthContext";
import { DensityProvider } from "@/context/DensityContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}>
        <DensityProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </DensityProvider>
      </body>
    </html>
  );
}
