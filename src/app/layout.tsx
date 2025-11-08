import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Disk MTV - Last.fm Music Charts",
  description:
    "Compilação das músicas e álbuns mais executados pelos usuários do grupo Disk MTV",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={geistSans.variable}>
        <Navigation />
        {/* Conteúdo principal */}
        <main>{children}</main>
      </body>
    </html>
  );
}
