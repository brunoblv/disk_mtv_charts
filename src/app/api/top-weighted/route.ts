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
  "renaimusou",
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
// No limit for individual user rankings - we want to show all plays
const MAX_PLAYS_PER_USER = 999999;

// Validate API_KEY is set
if (!API_KEY) {
  throw new Error(
    "API_KEY environment variable is not set. Please add it to your .env.local file."
  );
}

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
  weightedScore: number;
  plays7Days: number;
  plays15Days: number;
  plays30Days: number;
  points7Days: number;
  points15Days: number;
  points30Days: number;
  userPlays: { [key: string]: number };
}

interface TrackData {
  playcount: number;
  userPlays: { [key: string]: number };
}

async function fetchUserWeeklyTracks(
  username: string,
  from: number,
  to: number
): Promise<Track[]> {
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getweeklytrackchart&user=${username}&api_key=${API_KEY}&from=${from}&to=${to}&format=json`;
    const response = await axios.get<LastFmResponse>(url);

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

async function getTrackCounts(
  from: number,
  to: number,
  targetUser?: string
): Promise<Map<string, TrackData>> {
  const trackData = new Map<string, TrackData>();

  // Se um usuário específico foi selecionado, busca apenas desse usuário
  const usersToFetch = targetUser ? [targetUser] : USERS;

  for (const user of usersToFetch) {
    const tracks = await fetchUserWeeklyTracks(user, from, to);

    for (const track of tracks) {
      const trackName = `${track.artist["#text"]} - ${track.name}`;
      const plays = Math.min(parseInt(track.playcount, 10), MAX_PLAYS_PER_USER);

      if (!trackData.has(trackName)) {
        trackData.set(trackName, {
          playcount: 0,
          userPlays: {},
        });
      }

      const data = trackData.get(trackName)!;
      data.playcount += plays;
      data.userPlays[user] = (data.userPlays[user] || 0) + plays;
    }
  }

  return trackData;
}

function getDateTimestamps(daysAgo: number): { from: number; to: number } {
  const now = new Date();
  const to = Math.floor(now.getTime() / 1000);
  const from = Math.floor(
    (now.getTime() - daysAgo * 24 * 60 * 60 * 1000) / 1000
  );
  return { from, to };
}

function getExclusivePeriod(
  fromDaysAgo: number,
  toDaysAgo: number
): { from: number; to: number } {
  const now = new Date();
  const to = Math.floor(
    (now.getTime() - toDaysAgo * 24 * 60 * 60 * 1000) / 1000
  );
  const from = Math.floor(
    (now.getTime() - fromDaysAgo * 24 * 60 * 60 * 1000) / 1000
  );
  return { from, to };
}

export async function GET(request: Request) {
  console.log("Calculando ranking ponderado");

  try {
    // Obtém o usuário da query string
    const { searchParams } = new URL(request.url);
    const targetUser = searchParams.get("user") || undefined;

    if (!targetUser) {
      return NextResponse.json(
        { error: "Parâmetro 'user' é obrigatório" },
        { status: 400 }
      );
    }

    console.log("Calculando ranking para usuário:", targetUser);

    // Calcula os timestamps para cada período exclusivo:
    // - 7 dias: últimos 7 dias (0 a 7 dias atrás)
    // - 15 dias: de 8 a 15 dias atrás (excluindo os últimos 7 dias)
    // - 30 dias: de 16 a 30 dias atrás (excluindo os últimos 15 dias)
    const period7Days = getDateTimestamps(7);
    const period15Days = getExclusivePeriod(15, 7);
    const period30Days = getExclusivePeriod(30, 15);

    console.log("Período 7 dias:", period7Days);
    console.log("Período 15 dias (8-15):", period15Days);
    console.log("Período 30 dias (16-30):", period30Days);

    // Busca os dados para cada período
    const [tracks7Days, tracks15Days, tracks30Days] = await Promise.all([
      getTrackCounts(period7Days.from, period7Days.to, targetUser),
      getTrackCounts(period15Days.from, period15Days.to, targetUser),
      getTrackCounts(period30Days.from, period30Days.to, targetUser),
    ]);

    // Calcula o score ponderado para cada música
    const allTracks = new Set<string>([
      ...tracks7Days.keys(),
      ...tracks15Days.keys(),
      ...tracks30Days.keys(),
    ]);

    const weightedRanking: TrackWithUserData[] = Array.from(allTracks)
      .map((trackName) => {
        const data7Days = tracks7Days.get(trackName) || {
          playcount: 0,
          userPlays: {},
        };
        const data15Days = tracks15Days.get(trackName) || {
          playcount: 0,
          userPlays: {},
        };
        const data30Days = tracks30Days.get(trackName) || {
          playcount: 0,
          userPlays: {},
        };

        // Fórmula: (score_7days * 5) + (score_15days * 3) + (score_30days * 2)
        const points7Days = data7Days.playcount * 5;
        const points15Days = data15Days.playcount * 3;
        const points30Days = data30Days.playcount * 2;
        const weightedScore = points7Days + points15Days + points30Days;

        // Combina os userPlays de todos os períodos
        const allUserPlays: { [key: string]: number } = {};
        for (const [user, plays] of Object.entries(data7Days.userPlays)) {
          allUserPlays[user] = (allUserPlays[user] || 0) + plays;
        }
        for (const [user, plays] of Object.entries(data15Days.userPlays)) {
          allUserPlays[user] = (allUserPlays[user] || 0) + plays;
        }
        for (const [user, plays] of Object.entries(data30Days.userPlays)) {
          allUserPlays[user] = (allUserPlays[user] || 0) + plays;
        }

        return {
          song: trackName,
          weightedScore,
          plays7Days: data7Days.playcount,
          plays15Days: data15Days.playcount,
          plays30Days: data30Days.playcount,
          points7Days,
          points15Days,
          points30Days,
          userPlays: allUserPlays,
        };
      })
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, 200)
      .map((track, index) => ({
        ...track,
        rank: index + 1,
      }));

    console.log("Ranking ponderado calculado:", weightedRanking);
    return NextResponse.json(weightedRanking);
  } catch (error) {
    console.error("Erro na API:", error);
    return NextResponse.json(
      { error: "Erro ao processar a requisição" },
      { status: 500 }
    );
  }
}
