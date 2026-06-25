import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "BMW DriveVerse",
  description: "Explore BMW models and start your customization journey.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="text-slate-100">
        <Navbar />
        <main className="min-h-[calc(100vh-72px)] overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
