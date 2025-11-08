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

interface Track {
  rank: number;
  song: string;
  plays: number;
  score: number;
  userPlays: { [key: string]: number };
  userScores: { [key: string]: number };
  listenersBonus: number;
}

export default function SongsPage() {
  // Calcula as datas padrão (últimos 7 dias)
  const getDefaultDates = () => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    
    return {
      startDate: formatDate(sevenDaysAgo),
      endDate: formatDate(today),
    };
  };

  const defaultDates = getDefaultDates();
  const [startDate, setStartDate] = useState<string>(defaultDates.startDate);
  const [endDate, setEndDate] = useState<string>(defaultDates.endDate);
  const [topTracks, setTopTracks] = useState<Track[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      alert("Por favor, selecione ambas as datas.");
      return;
    }

    setIsLoading(true);
    setTopTracks(null);

    try {
      const response = await fetch(
        `/api/songs?startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) {
        throw new Error("Erro ao buscar as músicas");
      }

      const data = await response.json();
      const limitedData = data.slice(0, 100);

      setTopTracks(limitedData);
    } catch (error) {
      console.error("Erro ao buscar as músicas:", error);
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
            Top 100 Músicas por Período
          </h1>
          <p className="text-lg text-slate-600">
            Ranking das músicas mais tocadas pelos usuários do Disk MTV
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
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
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

        {/* Tabela de músicas */}
        {topTracks && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-16"></TableHead>
                  <TableHead className="w-20 text-center">#</TableHead>
                  <TableHead>Música</TableHead>
                  <TableHead className="w-32 text-center">
                    Total Plays
                  </TableHead>
                  <TableHead className="w-32 text-center">
                    Score
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topTracks.map((track, index) => (
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
                        {track.rank}
                      </TableCell>
                      <TableCell className="font-medium">
                        {track.song}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-green-600">
                        {track.plays.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-purple-600">
                        {track.score.toLocaleString()}
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
                                +{track.listenersBonus.toLocaleString()} pontos
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                {Object.keys(track.userPlays).length} ouvinte(s) × 20 × 0.2
                              </p>
                            </div>
                            <h4 className="font-medium text-slate-700 mb-3">
                              Plays e Scores por Usuário
                            </h4>
                            {Object.keys(track.userPlays).length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(track.userPlays)
                                  .filter(([, plays]) => plays > 0)
                                  .sort(
                                    ([, playsA], [, playsB]) => playsB - playsA
                                  )
                                  .map(([user, plays]) => {
                                    const userScore = track.userScores[user] || 0;
                                    const limitedPlays = Math.min(plays, 7);
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
                                            <span className="text-base font-bold text-green-600">
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
                                Nenhum usuário ouviu esta música no período
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
