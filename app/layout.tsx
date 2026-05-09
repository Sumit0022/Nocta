import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { connectDB } from "@/lib/db";
import Settings from "@/models/Settings";
import { Toaster } from "sonner"; // 🚀 Import Toaster

const inter = Inter({ subsets: ["latin"] });

// ... (Metadata logic same rahega)

export default function GuestLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} bg-neutral-950 text-white antialiased selection:bg-white/10`}>
        {/* 🚀 Toaster ko yahan rakha hai taaki ye har page par kaam kare */}
        <Toaster position="top-right" richColors expand={true} />
        {children}
      </body>
    </html>
  );
}