"use client";

import { useEffect, useState } from "react";
import Table from "@mui/joy/Table";
import { Container, Typography, Skeleton } from "@mui/joy";

interface Album {
  album: string;
  plays: number;
}

export default function MusicCharts() {
  const [topAlbums, setTopAlbums] = useState<Album[] | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api", {
          method: "GET",
        });
        if (!response.ok) {
          throw new Error("Erro ao buscar os álbuns");
        }
        const data = await response.json();

        // Limita os dados a 100 itens
        const limitedData = data.slice(0, 100);
        setTopAlbums(limitedData);
      } catch (error) {
        console.error("Erro ao buscar os álbuns:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <Container>
      <Typography level="h4" sx={{ mb: 2 }}>
        Last 7 Days Top 100 Albums
      </Typography>
      <Table>
        <thead>
          <tr>
            <th>#</th>
            <th>Album</th>
            <th>Plays</th>
          </tr>
        </thead>
        <tbody>
          {topAlbums === null ? (
            // Exibe um esqueleto enquanto os dados são carregados
            Array.from({ length: 10 }).map((_, index) => (
              <tr key={index}>
                <td>
                  <Skeleton variant="text" />
                </td>
                <td>
                  <Skeleton variant="text" />
                </td>
                <td>
                  <Skeleton variant="text" />
                </td>
              </tr>
            ))
          ) : (
            // Exibe os dados reais (limitados a 100 itens)
            topAlbums.map((album, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{album.album}</td>
                <td>{album.plays}</td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </Container>
  );
}