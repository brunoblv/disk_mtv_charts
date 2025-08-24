import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Music, Disc3, Home, Mic2 } from "lucide-react";

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
    <html lang="pt-BR">
      <body className={geistSans.variable}>
        {/* Navegação */}
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Link
                  href="/"
                  className="flex items-center space-x-2 text-xl font-bold text-slate-900"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <Music className="w-5 h-5 text-white" />
                  </div>
                  <span>Disk MTV Charts</span>
                </Link>
              </div>

              <div className="flex items-center space-x-8">
                <Link
                  href="/"
                  className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  <span>Início</span>
                </Link>
                <Link
                  href="/albums"
                  className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <Disc3 className="w-4 h-4" />
                  <span>Álbuns</span>
                </Link>
                <Link
                  href="/songs"
                  className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <Music className="w-4 h-4" />
                  <span>Músicas</span>
                </Link>
                <Link
                  href="/artists"
                  className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <Mic2 className="w-4 h-4" />
                  <span>Artistas</span>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Conteúdo principal */}
        <main>{children}</main>
      </body>
    </html>
  );
}
