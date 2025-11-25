"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronRight, TrendingUp, RefreshCw } from "lucide-react";
import React from "react";
import { LASTFM_USERS } from "@/lib/users";

interface Track {
  rank: number;
  song: string;
  weightedScore: number;
  plays7Days: number;
  plays15Days: number;
  plays30Days: number;
  points7Days: number;
  points15Days: number;
  points30Days: number;
  userPlays: { [key: string]: number };
}

const USERS = LASTFM_USERS;

export default function TopWeightedPage() {
  const [topTracks, setTopTracks] = useState<Track[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleLoad = async () => {
    if (!selectedUser) {
      setError("Por favor, selecione um usuário");
      return;
    }

    setIsLoading(true);
    setTopTracks(null);
    setError("");

    try {
      const response = await fetch(
        `/api/top-weighted?user=${encodeURIComponent(selectedUser)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Erro ao buscar o ranking ponderado"
        );
      }

      const data = await response.json();
      setTopTracks(data);
    } catch (error) {
      console.error("Erro ao buscar o ranking:", error);
      setError(error instanceof Error ? error.message : "Erro desconhecido");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRow = useCallback((index: number) => {
    setExpandedRows((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(index)) {
        newExpanded.delete(index);
      } else {
        newExpanded.add(index);
      }
      return newExpanded;
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 pt-16">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Top 200 Músicas - Parada Semanal Ponderada
          </h1>
          <p className="text-lg text-slate-600 mb-4">
            Ranking ponderado das músicas mais tocadas por um usuário do Disk
            MTV
          </p>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 mb-6 max-w-2xl mx-auto">
            <div className="mb-4">
              <label
                htmlFor="user-select"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Selecione o Usuário
              </label>
              <Input
                id="user-select"
                type="text"
                list="users"
                placeholder="Digite ou selecione um usuário"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="max-w-md mx-auto"
              />
              <datalist id="users">
                {USERS.map((user) => (
                  <option key={user} value={user} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 mb-6 max-w-2xl mx-auto">
            <h3 className="font-semibold text-slate-900 mb-2">
              🧮 Fórmula de Pontuação
            </h3>
            <div className="text-sm text-slate-700 space-y-1">
              <p>• Peso 5 para os últimos 7 dias</p>
              <p>• Peso 3 para os últimos 15 dias</p>
              <p>• Peso 2 para os últimos 30 dias</p>
              <p className="mt-2 pt-2 border-t border-slate-200 font-medium">
                Score Total = (7 dias × 5) + (15 dias × 3) + (30 dias × 2)
              </p>
            </div>
          </div>
          <Button
            onClick={handleLoad}
            disabled={isLoading || !selectedUser}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 mb-4 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Atualizando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Calcular Ranking
              </div>
            )}
          </Button>

          {/* Mensagem de erro */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Tabela de músicas */}
        {topTracks && topTracks.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-16"></TableHead>
                  <TableHead className="w-20 text-center">#</TableHead>
                  <TableHead>Música</TableHead>
                  <TableHead className="w-32 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      <span>Score</span>
                    </div>
                  </TableHead>
                  <TableHead className="w-32 text-center text-xs">
                    7 dias (pts)
                  </TableHead>
                  <TableHead className="w-32 text-center text-xs">
                    15 dias (pts)
                  </TableHead>
                  <TableHead className="w-32 text-center text-xs">
                    30 dias (pts)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topTracks.map((track, index) => (
                  <React.Fragment key={`${track.song}-${index}`}>
                    <TableRow>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRow(index)}
                          className="h-8 w-8 p-0 hover:bg-slate-200"
                        >
                          {expandedRows.has(index) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-center font-medium text-slate-600">
                        {track.rank}
                      </TableCell>
                      <TableCell className="font-medium">
                        {track.song}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-purple-600">
                        {track.weightedScore.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        <div className="text-slate-600">
                          {track.plays7Days} plays
                        </div>
                        <div className="font-semibold text-blue-600">
                          {track.points7Days} pts
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        <div className="text-slate-600">
                          {track.plays15Days} plays
                        </div>
                        <div className="font-semibold text-blue-600">
                          {track.points15Days} pts
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        <div className="text-slate-600">
                          {track.plays30Days} plays
                        </div>
                        <div className="font-semibold text-blue-600">
                          {track.points30Days} pts
                        </div>
                      </TableCell>
                    </TableRow>

                    {expandedRows.has(index) && (
                      <TableRow>
                        <TableCell colSpan={7} className="p-0">
                          <div className="bg-slate-50 p-4 border-t">
                            <h4 className="font-medium text-slate-700 mb-3">
                              Detalhes das Plays
                            </h4>
                            <div className="bg-white rounded-lg p-4 border">
                              <div className="text-sm font-medium text-slate-600 mb-2">
                                Usuário: {selectedUser}
                              </div>
                              <div className="text-2xl font-bold text-green-600">
                                {track.userPlays[selectedUser] || 0} plays
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Mensagem quando não há músicas */}
        {topTracks && topTracks.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <p className="text-center text-slate-600">
              Nenhuma música encontrada para o usuário{" "}
              <span className="font-semibold">{selectedUser}</span>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
