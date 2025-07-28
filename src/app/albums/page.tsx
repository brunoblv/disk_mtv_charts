"use client";

import { useState } from "react";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"; // Alterado para AdapterDayjs
import { Button } from "@mui/joy";
import Table from "@mui/joy/Table";
import { Container, Typography } from "@mui/joy";
import dayjs from "dayjs"; // Importe o dayjs

interface Album {
  album: string;
  plays: number;
}

export default function MusicCharts() {
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null); // Use dayjs.Dayjs
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null); // Use dayjs.Dayjs
  const [topAlbums, setTopAlbums] = useState<Album[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      alert("Por favor, selecione ambas as datas.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/albums?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao buscar os álbuns");
      }

      const data = await response.json();

      // Limita os dados a 100 itens
      const limitedData = data.slice(0, 100);
      setTopAlbums(limitedData);
    } catch (error) {
      console.error("Erro ao buscar os álbuns:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}> {/* Alterado para AdapterDayjs */}
      <Container>
        <Typography level="h4" sx={{ mb: 2 }}>
          Top 100 Albums por Período
        </Typography>

        {/* Seletor de datas */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
          <DatePicker
            label="Data Inicial"
            value={startDate}
            format="DD/MM/YYYY"
            onChange={(newValue) => setStartDate(newValue)}
          />
          <DatePicker
            label="Data Final"
            value={endDate}
            format="DD/MM/YYYY"
            onChange={(newValue) => setEndDate(newValue)}
          />
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? "Buscando..." : "Buscar"}
          </Button>
        </div>

        {/* Tabela de álbuns */}
        {topAlbums && (
          <Table>
            <thead>
              <tr>
                <th>#</th>
                <th>Album</th>
                <th>Plays</th>
              </tr>
            </thead>
            <tbody>
              {topAlbums.map((album, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{album.album}</td>
                  <td>{album.plays}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Container>
    </LocalizationProvider>
  );
}