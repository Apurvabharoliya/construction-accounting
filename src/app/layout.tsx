import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Construction Accounting App",
  description: "Cloud-based accounting for construction businesses with GST compliance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen min-w-0">
          <TopBar />
          <main className="flex-1 p-4 md:p-6 overflow-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </main>
        </div>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
