import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 pt-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            Disk MTV - Last.fm Charts
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Compilação das músicas e álbuns mais executados pelos usuários do
            grupo Disk MTV
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Card de Álbuns */}
          <Link href="/albums" className="group">
            <Card className="h-full transition-all duration-300 hover:shadow-xl hover:scale-105 border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-2xl text-white">
                  💿
                </div>
                <CardTitle className="text-2xl text-slate-900">
                  Ranking de Álbuns
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-slate-600 text-base">
                  Visualize o ranking dos álbuns mais ouvidos no período
                  selecionado.
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          {/* Card de Músicas */}
          <Link href="/songs" className="group">
            <Card className="h-full transition-all duration-300 hover:shadow-xl hover:scale-105 border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-2xl text-white">
                  🎵
                </div>
                <CardTitle className="text-2xl text-slate-900">
                  Ranking de Músicas
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-slate-600 text-base">
                  Explore o ranking das músicas mais tocadas pelos usuários.
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </main>
  );
}
