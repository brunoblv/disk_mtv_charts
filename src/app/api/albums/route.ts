import { NextResponse } from "next/server";
import axios from "axios";

const API_KEY = process.env.API_KEY;
// Aceita ambos os nomes: SPOTIFY_CLIENT_SECRET ou SPOTIFY_SECRET
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID?.trim();
const SPOTIFY_CLIENT_SECRET = (process.env.SPOTIFY_CLIENT_SECRET || process.env.SPOTIFY_SECRET)?.trim();
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
  userScores: { [key: string]: number };
  listenersBonus: number;
  coverImage?: string;
  albumType?: "album" | "ep" | "single";
}

/**
 * Obtém token de acesso do Spotify
 */
let spotifyToken: string | null = null;
let spotifyTokenExpiry: number = 0;

async function getSpotifyToken(): Promise<string | null> {
  // Verifica se as variáveis estão sendo lidas
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    if (process.env.NODE_ENV === "development") {
      console.warn("⚠️ Credenciais do Spotify não configuradas");
      console.warn("   Verifique se SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET estão no arquivo .env");
      console.warn("   Formato esperado:");
      console.warn("   SPOTIFY_CLIENT_ID=seu_client_id_aqui");
      console.warn("   SPOTIFY_CLIENT_SECRET=seu_client_secret_aqui");
      console.warn("   Após adicionar, reinicie o servidor (Ctrl+C e depois npm run dev)");
    }
    return null;
  }

  // Reutiliza token se ainda for válido (com margem de 1 minuto)
  if (spotifyToken && Date.now() < spotifyTokenExpiry - 60000) {
    return spotifyToken;
  }

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      "grant_type=client_credentials",
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
          ).toString("base64")}`,
        },
      }
    );

    spotifyToken = response.data.access_token;
    spotifyTokenExpiry = Date.now() + response.data.expires_in * 1000;
    return spotifyToken;
  } catch (error) {
    console.error("Erro ao obter token do Spotify:", error);
    return null;
  }
}

/**
 * Busca informações do álbum no Spotify
 */
interface SpotifyAlbumInfo {
  coverImage?: string;
  albumType?: "album" | "ep" | "single";
  found: boolean; // Indica se encontrou o álbum no Spotify
}

async function searchSpotifyAlbum(
  artistName: string,
  albumName: string,
  retryCount = 0
): Promise<SpotifyAlbumInfo> {
  const token = await getSpotifyToken();
  if (!token) {
    return { found: false };
  }

  try {
    // Limpa e normaliza os nomes para busca
    const cleanArtistName = artistName.trim();
    const cleanAlbumName = albumName.trim();
    
    // Tenta busca com artist e album
    let searchQuery = `artist:"${cleanArtistName}" album:"${cleanAlbumName}"`;
    let response = await axios.get("https://api.spotify.com/v1/search", {
      params: {
        q: searchQuery,
        type: "album",
        limit: 5,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    let albums = response.data.albums?.items || [];
    
    // Se não encontrou, tenta busca mais simples
    if (albums.length === 0) {
      searchQuery = `${cleanArtistName} ${cleanAlbumName}`;
      response = await axios.get("https://api.spotify.com/v1/search", {
        params: {
          q: searchQuery,
          type: "album",
          limit: 5,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      albums = response.data.albums?.items || [];
    }

    if (albums.length === 0) {
      return { found: false };
    }

    // Procura o melhor match (artista e nome do álbum mais próximos)
    const normalizedAlbumName = cleanAlbumName.toLowerCase();
    const normalizedArtistName = cleanArtistName.toLowerCase();
    
    let bestMatch = albums[0];
    let bestScore = 0;

    for (const album of albums) {
      const albumArtistName = album.artists?.[0]?.name?.toLowerCase() || "";
      const albumNameLower = album.name?.toLowerCase() || "";
      
      // Verifica se o artista corresponde
      const artistMatch = albumArtistName.includes(normalizedArtistName) || 
                         normalizedArtistName.includes(albumArtistName);
      
      // Verifica se o nome do álbum corresponde
      const albumMatch = albumNameLower.includes(normalizedAlbumName) || 
                        normalizedAlbumName.includes(albumNameLower);
      
      let score = 0;
      if (artistMatch) score += 2;
      if (albumMatch) score += 2;
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = album;
      }
    }

    // Só retorna se houver match razoável
    if (bestScore < 2) {
      return { found: false };
    }

    const albumType = bestMatch.album_type as "album" | "ep" | "single";
    const coverImage = bestMatch.images?.[0]?.url || bestMatch.images?.[1]?.url;

    return {
      coverImage: coverImage,
      albumType: albumType, // Retorna o tipo real (album, ep ou single)
      found: true,
    };
  } catch (error: any) {
    // Tratamento de rate limit (429)
    if (error.response?.status === 429 && retryCount < 3) {
      const retryAfter = error.response.headers['retry-after'] 
        ? parseInt(error.response.headers['retry-after']) * 1000 
        : Math.pow(2, retryCount) * 1000; // Backoff exponencial: 1s, 2s, 4s
      
      console.log(`⏳ Rate limit atingido. Aguardando ${retryAfter}ms antes de tentar novamente...`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter));
      return searchSpotifyAlbum(artistName, albumName, retryCount + 1);
    }
    
    console.error(
      `Erro ao buscar álbum no Spotify: ${artistName} - ${albumName}`,
      error.response?.status || error.message
    );
    return { found: false };
  }
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
    "Deluxe Experience Edition",
    "Extended Edition",
    "Deluxe Edition",
    "Deluxe Version",
    "édition de luxe",
    "Special Edition",
    "20th Anniversary Edition",
    "10th Anniversary Edition",
    "Twenty Years Edition",
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
  const albumDisplayNames = new Map<string, string>(); // Armazena o nome de exibição original

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
      
      // Normaliza para lowercase para agrupar variações de capitalização
      const normalizedKey = `${normalizedArtistName.toLowerCase()} - ${normalizedAlbumName.toLowerCase()}`;
      
      // Mantém o nome original formatado para exibição
      const displayName = `${normalizedArtistName} - ${normalizedAlbumName}`;
      
      const plays = parseInt(album.playcount, 10);

      // Atualiza os plays por usuário (soma se o usuário já tiver plays deste álbum)
      if (!userPlays.has(normalizedKey)) {
        userPlays.set(normalizedKey, {});
      }
      const currentUserPlays = userPlays.get(normalizedKey)!;
      // Soma os plays em vez de substituir (para casos onde o usuário ouviu versão normal + deluxe)
      currentUserPlays[user] = (currentUserPlays[user] || 0) + plays;
      
      // Armazena o nome de exibição (usa o primeiro encontrado ou mantém o existente)
      if (!albumDisplayNames.has(normalizedKey)) {
        albumDisplayNames.set(normalizedKey, displayName);
      }
    }
  }

  // Aplica o limite máximo por usuário e calcula os totais após processar todos os usuários
  const albumScores = new Map<string, { plays: number; score: number; userScores: { [key: string]: number }; listenersBonus: number }>();
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
      // Calcula o score individual do usuário (plays limitados × 0.9) × 10
      userScores[user] = limitedPlays * 0.9 * 10;
      numUsers++;
    }

    // Calcula o score híbrido: (Total de plays × 0.9) + (Número de usuários × Multiplicador × 0.1)
    // Multiplicado por 10 para eliminar casas decimais
    const USER_MULTIPLIER = 20; // Multiplicador para o número de usuários
    const listenersBonus = (numUsers * USER_MULTIPLIER * 0.1) * 10;
    const score = (totalPlays * 0.9 + (numUsers * USER_MULTIPLIER * 0.1)) * 10;

    albumCounts.set(normalizedKey, totalPlays);
    albumScores.set(normalizedKey, { plays: totalPlays, score, userScores, listenersBonus });
  }

  // Calcula o ranking completo primeiro (sem filtro de singles)
  const ranking = Array.from(albumCounts.entries())
    .map(([normalizedKey, plays]) => {
      const scoreData = albumScores.get(normalizedKey);
      const displayName = albumDisplayNames.get(normalizedKey) || normalizedKey;
      return {
        name: displayName,
        normalizedKey,
        plays,
        score: scoreData?.score || 0,
        userPlays: originalUserPlays.get(normalizedKey) || {},
        userScores: scoreData?.userScores || {},
        listenersBonus: scoreData?.listenersBonus || 0,
      };
    })
    .sort((a, b) => b.score - a.score) // Ordena por score
    .map((item, index) => ({
      rank: index + 1,
      album: item.name,
      normalizedKey: item.normalizedKey,
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

  // Agora busca informações do Spotify para cada álbum do ranking
  // Limita aos top 100 para economizar requisições da API do Spotify
  const spotifyInfoMap = new Map<string, SpotifyAlbumInfo>();
  const top100Albums = ranking.slice(0, 100);

  // Só busca no Spotify se tiver credenciais configuradas
  const hasSpotifyCredentials = !!SPOTIFY_CLIENT_ID && !!SPOTIFY_CLIENT_SECRET;
  
  if (hasSpotifyCredentials && top100Albums.length > 0) {
    console.log(`🎵 Spotify: Buscando capas para top ${top100Albums.length} álbuns...`);
    
    // Processa em lotes maiores e em paralelo para acelerar
    for (let i = 0; i < top100Albums.length; i += 10) {
      const batch = top100Albums.slice(i, i + 10);
      
      // Processa em paralelo dentro do lote para acelerar
      const promises = batch.map(async (albumItem) => {
        const [artistName, ...albumNameParts] = albumItem.album.split(" - ");
        const albumNameOnly = albumNameParts.join(" - ");
        const spotifyInfo = await searchSpotifyAlbum(artistName, albumNameOnly);
        return { normalizedKey: albumItem.normalizedKey, spotifyInfo };
      });
      
      const results = await Promise.all(promises);
      results.forEach(({ normalizedKey, spotifyInfo }) => {
        spotifyInfoMap.set(normalizedKey, spotifyInfo);
      });
      
      // Delay menor entre lotes (apenas se não for o último lote)
      if (i + 10 < top100Albums.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
    
    const foundCount = Array.from(spotifyInfoMap.values()).filter(info => info.found).length;
    const withCoverCount = Array.from(spotifyInfoMap.values()).filter(info => info.coverImage).length;
    console.log(`✅ Spotify: ${foundCount} encontrados, ${withCoverCount} com capa`);
  } else {
    if (!hasSpotifyCredentials) {
      console.log("⚠️ Spotify: Credenciais não configuradas (SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET)");
    }
  }

  // Adiciona informações do Spotify e filtra singles
  // Só filtra singles se tiver credenciais do Spotify configuradas e encontrou o álbum
  
  const finalRanking = ranking
    .map((item) => {
      const spotifyInfo = spotifyInfoMap.get(item.normalizedKey) || { found: false };
      return {
        ...item,
        coverImage: spotifyInfo.coverImage,
        albumType: spotifyInfo.albumType,
      };
    })
    // Filtra singles apenas se:
    // 1. Tiver credenciais do Spotify configuradas
    // 2. E encontrou o álbum no Spotify (found === true)
    // 3. E o tipo for "single"
    .filter((item) => {
      if (!hasSpotifyCredentials) {
        // Sem credenciais, não filtra nada
        return true;
      }
      const spotifyInfo = spotifyInfoMap.get(item.normalizedKey);
      // Se não encontrou no Spotify, mantém (não filtra)
      if (!spotifyInfo || !spotifyInfo.found) {
        return true;
      }
      // Se encontrou e é single, filtra (remove)
      // Se encontrou e é album ou ep, mantém
      return spotifyInfo.albumType !== "single";
    })
    // Reordena os ranks após filtrar
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  return finalRanking;
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
  // Data inicial: início do dia (00:00:00)
  const from = Math.floor(new Date(startDate + "T00:00:00").getTime() / 1000);
  // Data final: fim do dia (23:59:59) para incluir todos os plays do dia
  const to = Math.floor(new Date(endDate + "T23:59:59").getTime() / 1000);

  try {
    const ranking = await getCombinedRanking(from, to);
    console.log(`✅ Ranking: ${ranking.length} álbuns processados`);
    return NextResponse.json(ranking);
  } catch (error) {
    console.error("Erro na API:", error);
    return NextResponse.json(
      { error: "Erro ao processar a requisição" },
      { status: 500 }
    );
  }
}
