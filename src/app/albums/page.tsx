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
  userPlays: { [key: string]: number };
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
                      <TableCell className="font-medium">
                        {album.album}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-blue-600">
                        {album.plays.toLocaleString()}
                      </TableCell>
                    </TableRow>

                    {expandedRows.has(index) && (
                      <TableRow>
                        <TableCell colSpan={4} className="p-0">
                          <div className="bg-slate-50 p-4 border-t">
                            <h4 className="font-medium text-slate-700 mb-3">
                              Plays por Usuário
                            </h4>
                            {Object.keys(album.userPlays).length > 0 ? (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.entries(album.userPlays)
                                  .filter(([, plays]) => plays > 0)
                                  .sort(
                                    ([, playsA], [, playsB]) => playsB - playsA
                                  )
                                  .map(([user, plays]) => (
                                    <div
                                      key={user}
                                      className="bg-white rounded-lg p-3 border"
                                    >
                                      <div className="text-sm font-medium text-slate-600 capitalize">
                                        {user}
                                      </div>
                                      <div className="text-lg font-bold text-blue-600">
                                        {plays}
                                      </div>
                                    </div>
                                  ))}
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
