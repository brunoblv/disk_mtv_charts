import { NextResponse } from 'next/server';
import axios from 'axios';

const API_KEY = process.env.API_KEY;
const USERS = [
  'blvbruno', 'romisk', 'rapha9095', 'Matheusygf', 'boofrnds', 'ohmymog_', 'LouLouFM2',
  'brn_4ever', 'alephunk', 'okpaulinho', 'lucas_SS', 'thecrazy_theus', 'flow__', 'hanamoyou',
  'thiago-hbm', 'thunder__', 'Petter_HD', 'BriRy', 'Lukitoo', 'otiagoqz','GabeeTTS', 'matttvieira', 'adrenalinedame'
];
const MAX_PLAYS_PER_USER = 15;

interface Album {
  artist: {
    '#text': string;
  };
  name: string;
  playcount: string;
}

interface WeeklyAlbumChart {
  album: Album[];
}

interface LastFmResponse {
  weeklyalbumchart: WeeklyAlbumChart;
}

async function fetchUserWeeklyAlbums(username: string, from: number, to: number): Promise<Album[]> {
  try {
    const url = `http://ws.audioscrobbler.com/2.0/?method=user.getweeklyalbumchart&user=${username}&api_key=${API_KEY}&from=${from}&to=${to}&format=json`;
    const response = await axios.get<LastFmResponse>(url);
    console.log(`from: ${from} to: ${to}`);

    if (!response.data.weeklyalbumchart?.album) {
      console.warn(`Nenhum álbum encontrado para ${username}`);
      return [];
    }

    return response.data.weeklyalbumchart.album;
  } catch (error) {
    console.error(`Erro ao buscar álbuns de ${username}:`, error);
    return [];
  }
}

async function getCombinedRanking(from: number, to: number) {
  const albumCounts = new Map<string, number>();

  for (const user of USERS) {
    const albums = await fetchUserWeeklyAlbums(user, from, to);

    for (const album of albums) {
      const albumName = `${album.artist['#text']} - ${album.name}`;
      const plays = Math.min(parseInt(album.playcount, 10), MAX_PLAYS_PER_USER);

      albumCounts.set(albumName, (albumCounts.get(albumName) || 0) + plays);
    }
  }

  const ranking = Array.from(albumCounts.entries())
    .sort(([, playsA], [, playsB]) => playsB - playsA)
    .map(([name, plays], index) => ({ rank: index + 1, album: name, plays }));

  return ranking;
}

export async function GET(request: Request) {
  console.log("Recebida requisição na API");

  // Extrai os parâmetros da query string
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "Parâmetros 'startDate' e 'endDate' são obrigatórios" }, { status: 400 });
  }

  // Converte as datas para timestamps Unix
  const from = Math.floor(new Date(startDate).getTime() / 1000);
  const to = Math.floor(new Date(endDate).getTime() / 1000);

  try {
    const ranking = await getCombinedRanking(from, to);
    console.log("Ranking calculado:", ranking);
    return NextResponse.json(ranking);
  } catch (error) {
    console.error("Erro na API:", error);
    return NextResponse.json({ error: "Erro ao processar a requisição" }, { status: 500 });
  }
}