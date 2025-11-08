"use client";

import { useState } from "react";
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
import { ChevronDown, ChevronRight, Search, Mic2 } from "lucide-react";
import React from "react";

interface Artist {
  rank: number;
  artist: string;
  plays: number;
  score: number;
  userPlays: { [key: string]: number };
  userScores: { [key: string]: number };
  listenersBonus: number;
  image?: string;
}

export default function ArtistsPage() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [topArtists, setTopArtists] = useState<Artist[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      alert("Por favor, selecione ambas as datas.");
      return;
    }

    setIsLoading(true);
    setTopArtists(null);

    try {
      const response = await fetch(
        `/api/artists?startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) {
        throw new Error("Erro ao buscar os artistas");
      }

      const data = await response.json();
      const limitedData = data.slice(0, 100);

      setTopArtists(limitedData);
    } catch (error) {
      console.error("Erro ao buscar os artistas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 pt-16">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Top 100 Artistas por Período
          </h1>
          <p className="text-lg text-slate-600">
            Ranking dos artistas mais ouvidos pelos usuários do Disk MTV
          </p>
        </div>

        {/* Seletor de datas */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data Inicial
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data Final
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isLoading}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Buscando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Buscar
                </div>
              )}
            </Button>
          </div>
        </div>

        {/* Tabela de artistas */}
        {topArtists && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-16"></TableHead>
                  <TableHead className="w-20 text-center">#</TableHead>
                  <TableHead>Artista</TableHead>
                  <TableHead className="w-32 text-center">
                    Total Plays
                  </TableHead>
                  <TableHead className="w-32 text-center">
                    Score
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topArtists.map((artist, index) => (
                  <React.Fragment key={index}>
                    <TableRow className="hover:bg-slate-50/50">
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
                        {artist.rank}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {artist.image ? (
                            <img
                              src={artist.image}
                              alt={artist.artist}
                              className="w-12 h-12 rounded-full object-cover border-2 border-slate-200"
                              onError={(e) => {
                                // Se a imagem falhar ao carregar, esconde o elemento
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center border-2 border-slate-200">
                              <Mic2 className="w-6 h-6 text-slate-500" />
                            </div>
                          )}
                          <span>{artist.artist}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-orange-600">
                        {artist.plays.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-purple-600">
                        {artist.score.toLocaleString()}
                      </TableCell>
                    </TableRow>

                    {expandedRows.has(index) && (
                      <TableRow>
                        <TableCell colSpan={5} className="p-0">
                          <div className="bg-slate-50 p-4 border-t">
                            <div className="mb-4">
                              <h4 className="font-medium text-slate-700 mb-2">
                                Bônus por Ouvintes
                              </h4>
                              <div className="text-lg font-bold text-purple-600">
                                +{artist.listenersBonus.toLocaleString()} pontos
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                {Object.keys(artist.userPlays).length} ouvinte(s) × 20 × 0.2
                              </p>
                            </div>
                            <h4 className="font-medium text-slate-700 mb-3">
                              Plays e Scores por Usuário
                            </h4>
                            {Object.keys(artist.userPlays).length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(artist.userPlays)
                                  .filter(([, plays]) => plays > 0)
                                  .sort(
                                    ([, playsA], [, playsB]) => playsB - playsA
                                  )
                                  .map(([user, plays]) => {
                                    const userScore = artist.userScores[user] || 0;
                                    const limitedPlays = Math.min(plays, 20);
                                    return (
                                      <div
                                        key={user}
                                        className="bg-white rounded-lg p-4 border"
                                      >
                                        <div className="text-sm font-medium text-slate-600 capitalize mb-2">
                                          {user}
                                        </div>
                                        <div className="space-y-1">
                                          <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-500">Plays:</span>
                                            <span className="text-base font-bold text-orange-600">
                                              {plays}
                                            </span>
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-500">Plays (limitados):</span>
                                            <span className="text-sm text-slate-400">
                                              {limitedPlays}
                                            </span>
                                          </div>
                                          <div className="flex justify-between items-center pt-1 border-t">
                                            <span className="text-xs text-slate-500">Score:</span>
                                            <span className="text-base font-bold text-purple-600">
                                              {userScore.toLocaleString()}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            ) : (
                              <p className="text-slate-500 text-center py-4">
                                Nenhum usuário ouviu este artista no período
                                selecionado
                              </p>
                            )}
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
      </div>
    </div>
  );
}
