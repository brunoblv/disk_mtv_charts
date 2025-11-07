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
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import React from "react";

interface Album {
  rank: number;
  album: string;
  plays: number;
  score: number;
  userPlays: { [key: string]: number };
  userScores: { [key: string]: number };
  listenersBonus: number;
  coverImage?: string;
  albumType?: "album" | "ep" | "single";
}

export default function AlbumsPage() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [topAlbums, setTopAlbums] = useState<Album[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      alert("Por favor, selecione ambas as datas.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/albums?startDate=${startDate}&endDate=${endDate}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao buscar os álbuns");
      }

      const data = await response.json();
      const limitedData = data.slice(0, 100);

      setTopAlbums(limitedData);
    } catch (error) {
      console.error("Erro ao buscar os álbuns:", error);
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
            Top 100 Álbuns por Período
          </h1>
          <p className="text-lg text-slate-600">
            Ranking dos álbuns mais ouvidos pelos usuários do Disk MTV
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
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
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

        {/* Tabela de álbuns */}
        {topAlbums && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-16"></TableHead>
                  <TableHead className="w-20 text-center">#</TableHead>
                  <TableHead>Álbum</TableHead>
                  <TableHead className="w-32 text-center">
                    Total Plays
                  </TableHead>
                  <TableHead className="w-32 text-center">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topAlbums.map((album, index) => (
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
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {album.coverImage ? (
                            <img
                              src={album.coverImage}
                              alt={album.album}
                              className="w-12 h-12 rounded object-cover flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-slate-200 flex-shrink-0 flex items-center justify-center">
                              <span className="text-xs text-slate-400">No</span>
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{album.album}</div>
                            {album.albumType && album.albumType !== "single" && (
                              <div className="text-xs text-slate-500 uppercase">
                                {album.albumType}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-blue-600">
                        {album.plays.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-purple-600">
                        {album.score.toLocaleString()}
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
                                +{album.listenersBonus.toLocaleString()} pontos
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                {Object.keys(album.userPlays).length} ouvinte(s) × 20 × 0.1
                              </p>
                            </div>
                            <h4 className="font-medium text-slate-700 mb-3">
                              Plays e Scores por Usuário
                            </h4>
                            {Object.keys(album.userPlays).length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(album.userPlays)
                                  .filter(([, plays]) => plays > 0)
                                  .sort(
                                    ([, playsA], [, playsB]) => playsB - playsA
                                  )
                                  .map(([user, plays]) => {
                                    const userScore = album.userScores[user] || 0;
                                    const limitedPlays = Math.min(plays, 15);
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
                                            <span className="text-base font-bold text-blue-600">
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
                                Nenhum usuário ouviu este álbum no período
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
