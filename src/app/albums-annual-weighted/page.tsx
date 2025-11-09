"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronRight } from "lucide-react";
import React from "react";

interface Album {
  rank: number;
  album: string;
  totalPoints: number;
  userPoints: { [key: string]: number };
  userPositions: { [key: string]: number };
}

export default function AlbumsAnnualWeightedPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [topAlbums, setTopAlbums] = useState<Album[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const handleSearch = async () => {
    setIsLoading(true);
    setTopAlbums(null);

    try {
      const response = await fetch(
        `/api/albums-annual-weighted?year=${selectedYear}`
      );

      if (!response.ok) {
        throw new Error("Erro ao buscar os álbuns");
      }

      const data = await response.json();
      setTopAlbums(data);
    } catch (error) {
      console.error("Erro ao buscar os álbuns:", error);
      alert("Erro ao buscar os álbuns. Tente novamente.");
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

  // Gera lista de anos (últimos 10 anos até o ano atual)
  const availableYears = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 pt-16">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Álbum Anual Ponderado
          </h1>
          <p className="text-lg text-slate-600">
            Ranking de álbuns baseado na posição nas listas dos usuários (100 pontos para 1º lugar, 99 para 2º, etc.)
          </p>
        </div>

        {/* Seletor de ano */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ano
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                {selectedYear === currentYear
                  ? `Calcula de 1/1/${selectedYear} até a data atual`
                  : `Calcula o ano completo: 1/1/${selectedYear} até 31/12/${selectedYear}`}
              </p>
            </div>
            <Button
              onClick={handleSearch}
              disabled={isLoading}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Calculando...
                </div>
              ) : (
                "Calcular Ranking"
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
                    Total de Pontos
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topAlbums.slice(0, 200).map((album, index) => (
                  <React.Fragment key={`${album.album}-${index}`}>
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
                        {album.rank}
                      </TableCell>
                      <TableCell className="font-medium">
                        {album.album}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-purple-600">
                        {album.totalPoints.toLocaleString()}
                      </TableCell>
                    </TableRow>

                    {expandedRows.has(index) && (
                      <TableRow>
                        <TableCell colSpan={4} className="p-0">
                          <div className="bg-slate-50 p-4 border-t">
                            <h4 className="font-medium text-slate-700 mb-3">
                              Pontos e Posições por Usuário
                            </h4>
                            {Object.keys(album.userPoints).length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(album.userPoints)
                                  .filter(([, points]) => points > 0)
                                  .sort(
                                    ([, pointsA], [, pointsB]) =>
                                      pointsB - pointsA
                                  )
                                  .map(([user, points]) => {
                                    const position = album.userPositions[user] || 0;
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
                                            <span className="text-xs text-slate-500">
                                              Posição:
                                            </span>
                                            <span className="text-base font-bold text-blue-600">
                                              #{position}
                                            </span>
                                          </div>
                                          <div className="flex justify-between items-center pt-1 border-t">
                                            <span className="text-xs text-slate-500">
                                              Pontos:
                                            </span>
                                            <span className="text-base font-bold text-purple-600">
                                              {points}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            ) : (
                              <p className="text-slate-500 text-center py-4">
                                Nenhum usuário tem este álbum em sua lista
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

