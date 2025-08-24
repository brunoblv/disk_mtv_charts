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
const MAX_PLAYS_PER_USER = 7;

interface Track {
  artist: {
    "#text": string;
  };
  name: string;
  playcount: string;
}

interface WeeklyTrackChart {
  track: Track[];
}

interface LastFmResponse {
  weeklytrackchart: WeeklyTrackChart;
}

interface TrackWithUserData {
  rank: number;
  song: string;
  plays: number;
  userPlays: { [key: string]: number };
}

async function fetchUserWeeklyTracks(
  username: string,
  from: number,
  to: number
): Promise<Track[]> {
  try {
    const url = `http://ws.audioscrobbler.com/2.0/?method=user.getweeklytrackchart&user=${username}&api_key=${API_KEY}&from=${from}&to=${to}&format=json`;
    const response = await axios.get<LastFmResponse>(url);
    console.log(`from: ${from} to: ${to}`);

    if (!response.data.weeklytrackchart?.track) {
      console.warn(`Nenhuma música encontrada para ${username}`);
      return [];
    }

    return response.data.weeklytrackchart.track;
  } catch (error) {
    console.error(`Erro ao buscar músicas de ${username}:`, error);
    return [];
  }
}

async function getCombinedRanking(
  from: number,
  to: number
): Promise<TrackWithUserData[]> {
  const trackCounts = new Map<string, number>();
  const userPlays = new Map<string, { [key: string]: number }>();

  for (const user of USERS) {
    const tracks = await fetchUserWeeklyTracks(user, from, to);

    for (const track of tracks) {
      const trackName = `${track.artist["#text"]} - ${track.name}`;
      const plays = Math.min(parseInt(track.playcount, 10), MAX_PLAYS_PER_USER);

      // Atualiza o total de plays
      trackCounts.set(trackName, (trackCounts.get(trackName) || 0) + plays);

      // Atualiza os plays por usuário
      if (!userPlays.has(trackName)) {
        userPlays.set(trackName, {});
      }
      const currentUserPlays = userPlays.get(trackName)!;
      currentUserPlays[user] = plays;
    }
  }

  const ranking = Array.from(trackCounts.entries())
    .sort(([, playsA], [, playsB]) => playsB - playsA)
    .map(([name, plays], index) => ({
      rank: index + 1,
      song: name,
      plays,
      userPlays: userPlays.get(name) || {},
    }));

  return ranking;
}

export async function GET(request: Request) {
  console.log("Recebida requisição na API");

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
    console.log("Ranking calculado:", ranking);
    return NextResponse.json(ranking);
  } catch (error) {
    console.error("Erro na API:", error);
    return NextResponse.json(
      { error: "Erro ao processar a requisição" },
      { status: 500 }
    );
  }
}
