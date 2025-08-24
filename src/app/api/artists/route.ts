import { NextResponse } from "next/server";
import axios from "axios";

const API_KEY = process.env.API_KEY;
const USERS = [
  "blvbruno",
  "romisk",
  "rapha9095",
  "Matheusygf",
  "boofrnds",
  "ohmymog_",
  "LouLouFM2",
  "brn_4ever",
  "alephunk",
  "okpaulinho",
  "lucas_SS",
  "thecrazy_theus",
  "flow__",
  "hanamoyou",
  "thiago-hbm",
  "thunder__",
  "Petter_HD",
  "BriRy",
  "Lukitoo",
  "otiagoqz",
  "GabeeTTS",
  "matttvieira",
  "adrenalinedame",
  "soprani",
];
const MAX_PLAYS_PER_USER = 20;

interface Artist {
  name: string;
  playcount: string;
}

interface WeeklyArtistChart {
  artist: Artist[];
}

interface LastFmResponse {
  weeklyartistchart: WeeklyArtistChart;
}

interface ArtistWithUserData {
  rank: number;
  artist: string;
  plays: number;
  userPlays: { [key: string]: number };
}

async function fetchUserWeeklyArtists(
  username: string,
  from: number,
  to: number
): Promise<Artist[]> {
  try {
    const url = `http://ws.audioscrobbler.com/2.0/?method=user.getweeklyartistchart&user=${username}&api_key=${API_KEY}&from=${from}&to=${to}&format=json`;
    const response = await axios.get<LastFmResponse>(url);

    if (!response.data.weeklyartistchart?.artist) {
      console.warn(`Nenhum artista encontrado para ${username}`);
      return [];
    }

    return response.data.weeklyartistchart.artist;
  } catch (error) {
    console.error(`Erro ao buscar artistas de ${username}:`, error);
    return [];
  }
}

async function getCombinedRanking(
  from: number,
  to: number
): Promise<ArtistWithUserData[]> {
  const artistCounts = new Map<string, number>();
  const userPlays = new Map<string, { [key: string]: number }>();

  for (const user of USERS) {
    const artists = await fetchUserWeeklyArtists(user, from, to);

    for (const artist of artists) {
      const artistName = artist.name;
      const plays = Math.min(
        parseInt(artist.playcount, 10),
        MAX_PLAYS_PER_USER
      );

      // Atualiza o total de plays
      artistCounts.set(artistName, (artistCounts.get(artistName) || 0) + plays);

      // Atualiza os plays por usuário
      if (!userPlays.has(artistName)) {
        userPlays.set(artistName, {});
      }
      const currentUserPlays = userPlays.get(artistName)!;
      currentUserPlays[user] = plays;
    }
  }

  const ranking = Array.from(artistCounts.entries())
    .sort(([, playsA], [, playsB]) => playsB - playsA)
    .map(([name, plays], index) => ({
      rank: index + 1,
      artist: name,
      plays,
      userPlays: userPlays.get(name) || {},
    }));

  return ranking;
}

export async function GET(request: Request) {
  console.log("Recebida requisição na API de artistas");

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "Parâmetros 'startDate' e 'endDate' são obrigatórios" },
      { status: 400 }
    );
  }

  const from = Math.floor(new Date(startDate).getTime() / 1000);
  const to = Math.floor(new Date(endDate).getTime() / 1000);

  try {
    const ranking = await getCombinedRanking(from, to);
    console.log("Ranking de artistas calculado:", ranking);
    return NextResponse.json(ranking);
  } catch (error) {
    console.error("Erro na API de artistas:", error);
    return NextResponse.json(
      { error: "Erro ao processar a requisição" },
      { status: 500 }
    );
  }
}
