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
const MAX_PLAYS_PER_USER = 15;

interface Album {
  artist: {
    "#text": string;
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

interface AlbumWithUserData {
  rank: number;
  album: string;
  plays: number;
  score: number;
  userPlays: { [key: string]: number };
}

/**
 * Normaliza o nome do álbum removendo tags de versões especiais entre parênteses
 * para que versões normais e especiais sejam agrupadas na contagem
 */
function normalizeAlbumName(albumName: string, artistName?: string): string {
  let normalized = albumName;

  // Regra especial para Rose Grey/Gray: "A Little Louder, Please (Deluxe)" -> "Louder, Please"
  if (
    artistName &&
    (artistName.toLowerCase() === "rose grey" ||
      artistName.toLowerCase() === "rose gray")
  ) {
    // Remove tags entre parênteses primeiro
    normalized = normalized.replace(/\s*\([^)]*\)\s*/gi, "");
    // Se começar com "A Little", remove isso
    normalized = normalized.replace(/^A Little\s+/i, "");
    normalized = normalized.trim();
  }

  // Lista de tags a serem removidas (case-insensitive)
  // Ordem importante: versões mais específicas primeiro
  const tagsToRemove = [
    "Expanded Edition",
    "Complete Edition",
    "Deluxe Edition",
    "édition de luxe",
    "Special Edition",
    "20th Anniversary Edition",
    "10th Anniversary Edition",
    "Deluxe",
    "Remastered",
  ];

  // Remove cada tag entre parênteses (case-insensitive)
  for (const tag of tagsToRemove) {
    // Cria regex para encontrar a tag entre parênteses
    // Escapa caracteres especiais da tag
    const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Padrão: espaços opcionais + parêntese abrindo + tag + parêntese fechando
    const pattern = "\\s*\\(\\s*" + escapedTag + "\\s*\\)";
    const regex = new RegExp(pattern, "gi");
    normalized = normalized.replace(regex, "");
  }

  // Remove espaços extras e trim
  normalized = normalized.trim().replace(/\s+/g, " ");

  return normalized;
}

async function fetchUserWeeklyAlbums(
  username: string,
  from: number,
  to: number
): Promise<Album[]> {
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

async function getCombinedRanking(
  from: number,
  to: number
): Promise<AlbumWithUserData[]> {
  const albumCounts = new Map<string, number>();
  const userPlays = new Map<string, { [key: string]: number }>();

  for (const user of USERS) {
    const albums = await fetchUserWeeklyAlbums(user, from, to);

    for (const album of albums) {
      // Normaliza o nome do artista para agrupar variações (Rose Grey/Gray)
      let normalizedArtistName = album.artist["#text"];
      if (normalizedArtistName.toLowerCase() === "rose gray") {
        normalizedArtistName = "Rose Grey"; // Padroniza para "Rose Grey"
      }

      // Normaliza o nome do álbum para agrupar versões especiais com a versão normal
      const normalizedAlbumName = normalizeAlbumName(
        album.name,
        normalizedArtistName
      );
      const albumName = `${normalizedArtistName} - ${normalizedAlbumName}`;
      const plays = parseInt(album.playcount, 10);

      // Atualiza os plays por usuário (soma se o usuário já tiver plays deste álbum)
      if (!userPlays.has(albumName)) {
        userPlays.set(albumName, {});
      }
      const currentUserPlays = userPlays.get(albumName)!;
      // Soma os plays em vez de substituir (para casos onde o usuário ouviu versão normal + deluxe)
      currentUserPlays[user] = (currentUserPlays[user] || 0) + plays;
    }
  }

  // Aplica o limite máximo por usuário e calcula os totais após processar todos os usuários
  const albumScores = new Map<string, { plays: number; score: number }>();

  for (const [albumName, userPlaysData] of userPlays.entries()) {
    let totalPlays = 0;
    let numUsers = 0;

    for (const user in userPlaysData) {
      // Aplica o limite máximo por usuário
      const limitedPlays = Math.min(userPlaysData[user], MAX_PLAYS_PER_USER);
      userPlaysData[user] = limitedPlays;
      totalPlays += limitedPlays;
      numUsers++;
    }

    // Calcula o score híbrido: (Total de plays × 0.9) + (Número de usuários × Multiplicador × 0.1)
    const USER_MULTIPLIER = 20; // Multiplicador para o número de usuários
    const score = totalPlays * 0.9 + numUsers * USER_MULTIPLIER * 0.1;

    albumCounts.set(albumName, totalPlays);
    albumScores.set(albumName, { plays: totalPlays, score });
  }

  const ranking = Array.from(albumCounts.entries())
    .map(([name, plays]) => ({
      name,
      plays,
      score: albumScores.get(name)?.score || 0,
      userPlays: userPlays.get(name) || {},
    }))
    .sort((a, b) => b.score - a.score) // Ordena por score em vez de plays
    .map((item, index) => ({
      rank: index + 1,
      album: item.name,
      plays: item.plays,
      score: Math.round(item.score * 100) / 100, // Arredonda para 2 casas decimais
      userPlays: item.userPlays,
    }));

  return ranking;
}

export async function GET(request: Request) {
  console.log("Recebida requisição na API");

  // Extrai os parâmetros da query string
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
