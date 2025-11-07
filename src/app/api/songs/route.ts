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
  score: number;
  userPlays: { [key: string]: number };
  userScores: { [key: string]: number };
  listenersBonus: number;
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
  const trackDisplayNames = new Map<string, string>(); // Armazena o nome de exibição original

  for (const user of USERS) {
    const tracks = await fetchUserWeeklyTracks(user, from, to);

    for (const track of tracks) {
      const artistName = track.artist["#text"];
      const trackName = track.name;
      
      // Normaliza para lowercase para agrupar variações de capitalização
      const normalizedKey = `${artistName.toLowerCase()} - ${trackName.toLowerCase()}`;
      
      // Mantém o nome original formatado para exibição
      const displayName = `${artistName} - ${trackName}`;
      
      const plays = parseInt(track.playcount, 10);

      // Atualiza os plays por usuário (soma se o usuário já tiver plays desta música)
      if (!userPlays.has(normalizedKey)) {
        userPlays.set(normalizedKey, {});
      }
      const currentUserPlays = userPlays.get(normalizedKey)!;
      // Soma os plays em vez de substituir (para casos onde o usuário ouviu a mesma música múltiplas vezes)
      currentUserPlays[user] = (currentUserPlays[user] || 0) + plays;
      
      // Armazena o nome de exibição (usa o primeiro encontrado ou mantém o existente)
      if (!trackDisplayNames.has(normalizedKey)) {
        trackDisplayNames.set(normalizedKey, displayName);
      }
    }
  }

  // Aplica o limite máximo por usuário e calcula os totais após processar todos os usuários
  const trackScores = new Map<string, { plays: number; score: number; userScores: { [key: string]: number }; listenersBonus: number }>();
  // Preserva os valores originais de userPlays para exibição
  const originalUserPlays = new Map<string, { [key: string]: number }>();

  for (const [normalizedKey, userPlaysData] of userPlays.entries()) {
    // Cria uma cópia dos valores originais para exibição
    const originalPlays: { [key: string]: number } = {};
    const userScores: { [key: string]: number } = {};
    
    for (const user in userPlaysData) {
      originalPlays[user] = userPlaysData[user];
    }
    originalUserPlays.set(normalizedKey, originalPlays);

    let totalPlays = 0;
    let numUsers = 0;

    for (const user in userPlaysData) {
      // Aplica o limite máximo por usuário apenas para o cálculo
      const limitedPlays = Math.min(userPlaysData[user], MAX_PLAYS_PER_USER);
      totalPlays += limitedPlays;
      // Calcula o score individual do usuário (plays limitados × 0.8) × 10
      userScores[user] = limitedPlays * 0.8 * 10;
      numUsers++;
    }

    // Calcula o score híbrido: (Total de plays × 0.8) + (Número de usuários × Multiplicador × 0.2)
    // Multiplicado por 10 para eliminar casas decimais
    const USER_MULTIPLIER = 20; // Multiplicador para o número de usuários
    const listenersBonus = (numUsers * USER_MULTIPLIER * 0.2) * 10;
    const score = (totalPlays * 0.8 + (numUsers * USER_MULTIPLIER * 0.2)) * 10;

    trackCounts.set(normalizedKey, totalPlays);
    trackScores.set(normalizedKey, { plays: totalPlays, score, userScores, listenersBonus });
  }

  const ranking = Array.from(trackCounts.entries())
    .map(([normalizedKey, plays]) => {
      const scoreData = trackScores.get(normalizedKey);
      const displayName = trackDisplayNames.get(normalizedKey) || normalizedKey;
      return {
        name: displayName,
        plays,
        score: scoreData?.score || 0,
        userPlays: originalUserPlays.get(normalizedKey) || {},
        userScores: scoreData?.userScores || {},
        listenersBonus: scoreData?.listenersBonus || 0,
      };
    })
    .sort((a, b) => b.score - a.score) // Ordena por score em vez de plays
    .map((item, index) => ({
      rank: index + 1,
      song: item.name,
      plays: item.plays,
      score: Math.round(item.score),
      userPlays: item.userPlays,
      userScores: Object.fromEntries(
        Object.entries(item.userScores).map(([user, score]) => [
          user,
          Math.round(score),
        ])
      ),
      listenersBonus: Math.round(item.listenersBonus),
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

  // Converte as datas para timestamps Unix
  // Data inicial: início do dia (00:00:00)
  const from = Math.floor(new Date(startDate + "T00:00:00").getTime() / 1000);
  // Data final: fim do dia (23:59:59) para incluir todos os plays do dia
  const to = Math.floor(new Date(endDate + "T23:59:59").getTime() / 1000);

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
