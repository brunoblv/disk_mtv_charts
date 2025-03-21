import { NextResponse } from 'next/server';
import axios from 'axios';

const API_KEY = '4a9f5581a9cdf20a699f540ac52a95c9';
const USERS = [
  'blvbruno', 'romisk', 'rapha9095', 'Matheusygf', 'boofrnds', 'ohmymog_', 'LouLouFM2',
  'brn_4ever', 'alephunk', 'okpaulinho', 'lucas_SS', 'thecrazy_theus', 'flow__', 'hanamoyou',
  'thiago-hbm', 'thunder__', 'Petter_HD', 'BriRy', 'Lukitoo', 'otiagoqz','GabeeTTS'
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

async function fetchUserWeeklyAlbums(username: string): Promise<Album[]> {
  try {
    const url = `http://ws.audioscrobbler.com/2.0/?method=user.getweeklyalbumchart&user=${username}&api_key=${API_KEY}&format=json`;
    const response = await axios.get<LastFmResponse>(url);

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

async function getCombinedRanking() {
  const albumCounts = new Map<string, number>();

  for (const user of USERS) {
    const albums = await fetchUserWeeklyAlbums(user);

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

export async function GET() {
  console.log("Recebida requisição na API");
  try {
    const ranking = await getCombinedRanking();
    console.log("Ranking calculado:", ranking);
    return NextResponse.json(ranking);
  } catch (error) {
    console.error("Erro na API:", error);
    return NextResponse.json({ error: "Erro ao processar a requisição" }, { status: 500 });
  }
}