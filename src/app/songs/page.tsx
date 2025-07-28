"use client";

import { useState } from "react";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Button } from "@mui/joy";
import Table from "@mui/joy/Table";
import { Container, Typography } from "@mui/joy";
import dayjs from "dayjs";

// MUDOU: Interface para refletir a resposta da API de músicas
interface Track {
  song: string;
  plays: number;
}

export default function MusicCharts() {
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null); // MUDOU: Estado para armazenar as músicas
  const [topTracks, setTopTracks] = useState<Track[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      alert("Por favor, selecione ambas as datas.");
      return;
    }

    setIsLoading(true);
    setTopTracks(null); // Limpa os resultados anteriores ao buscar

    try {
      // MUDOU: Endpoint para /api/songs
      const response = await fetch(
        `/api/songs?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );

      if (!response.ok) {
        // MUDOU: Mensagem de erro
        throw new Error("Erro ao buscar as músicas");
      }

      const data = await response.json();
      const limitedData = data.slice(0, 100); // MUDOU: Atualiza o estado das músicas

      setTopTracks(limitedData);
    } catch (error) {
      // MUDOU: Mensagem de erro
      console.error("Erro ao buscar as músicas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
          
     <Container>     
        <Typography level="h4" sx={{ mb: 2 }}>
            Top 100 Músicas por Período
        </Typography> 
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
                {/* MUDOU: Tabela de músicas */}       
        {topTracks && (
          <Table>
            {/* <thead> agrupa o cabeçalho da tabela */}
            <thead>
              {/* <tr> cria uma ÚNICA LINHA para os títulos */}
              <tr>
                {/* <th> são as células DENTRO da mesma linha de cabeçalho */}
                <th>#</th>
                <th>Música</th>
                <th>Plays</th>
              </tr>
            </thead>

            {/* <tbody> agrupa o corpo da tabela */}
            <tbody>
              {/* .map() cria uma NOVA LINHA <tr> para cada música */}
              {topTracks.map((track, index) => (
                <tr key={index}>
                  {/* <td> são as células de dados DENTRO da mesma linha */}
                  <td>{index + 1}</td>
                  <td>{track.song}</td>
                  <td>{track.plays}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
             
      </Container>
        
    </LocalizationProvider>
  );
}
