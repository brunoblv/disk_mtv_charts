import { NextResponse } from "next/server";
import axios from "axios";
import { LASTFM_USERS } from "@/lib/users";

const API_KEY = process.env.API_KEY;
// Aceita múltiplos nomes para o secret: SPOTIFY_CLIENT_SECRET, SPOTIFY_SECRET, SPOTIFY_CLIENT_SECRET_KEY
const SPOTIFY_CLIENT_ID_RAW = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET_RAW = process.env.SPOTIFY_CLIENT_SECRET || 
                                   process.env.SPOTIFY_SECRET || 
                                   process.env.SPOTIFY_CLIENT_SECRET_KEY;
// Remove caracteres especiais invisíveis e espaços
const SPOTIFY_CLIENT_ID = SPOTIFY_CLIENT_ID_RAW?.replace(/[\u200B-\u200D\uFEFF]/g, '').trim() || undefined;
const SPOTIFY_CLIENT_SECRET = SPOTIFY_CLIENT_SECRET_RAW?.replace(/[\u200B-\u200D\uFEFF]/g, '').trim() || undefined;
const USERS = LASTFM_USERS;

// Validate API_KEY is set
if (!API_KEY) {
  throw new Error(
    "API_KEY environment variable is not set. Please add it to your .env.local file."
  );
}

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
  totalPoints: number;
  userPoints: { [key: string]: number };
  userPositions: { [key: string]: number };
  normalizedKey: string;
  releaseDate?: string; // Ano de lançamento
}

interface SpotifyAlbumInfo {
  albumType?: "album" | "ep" | "single";
  releaseDate?: string; // Data de lançamento (formato: YYYY-MM-DD ou YYYY)
  found: boolean;
}

/**
 * Normaliza o nome do álbum removendo tags de versões especiais entre parênteses
 */
function normalizeAlbumName(albumName: string, artistName?: string): string {
  let normalized = albumName;

  // Regra especial para Rose Grey/Gray
  if (
    artistName &&
    (artistName.toLowerCase() === "rose grey" ||
      artistName.toLowerCase() === "rose gray")
  ) {
    normalized = normalized.replace(/\s*\([^)]*\)\s*/gi, "");
    normalized = normalized.replace(/^A Little\s+/i, "");
    normalized = normalized.trim();
  }

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

  for (const tag of tagsToRemove) {
    const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = "\\s*\\(\\s*" + escapedTag + "\\s*\\)";
    const regex = new RegExp(pattern, "gi");
    normalized = normalized.replace(regex, "");
  }

  normalized = normalized.trim().replace(/\s+/g, " ");
  return normalized;
}

/**
 * Obtém token de acesso do Spotify
 */
let spotifyToken: string | null = null;
let spotifyTokenExpiry: number = 0;

async function getSpotifyToken(): Promise<string | null> {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
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
 * Busca informações do álbum no Spotify para verificar o tipo
 */
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
    const cleanArtistName = artistName.trim();
    const cleanAlbumName = albumName.trim();
    
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

    const normalizedAlbumName = cleanAlbumName.toLowerCase();
    const normalizedArtistName = cleanArtistName.toLowerCase();
    
    let bestMatch = albums[0];
    let bestScore = 0;

    for (const album of albums) {
      const albumArtistName = album.artists?.[0]?.name?.toLowerCase() || "";
      const albumNameLower = album.name?.toLowerCase() || "";
      
      const artistMatch = albumArtistName.includes(normalizedArtistName) || 
                         normalizedArtistName.includes(albumArtistName);
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

    if (bestScore < 2) {
      return { found: false };
    }

    const albumType = bestMatch.album_type as "album" | "ep" | "single";
    const releaseDate = bestMatch.release_date; // Formato: YYYY-MM-DD ou YYYY

    return {
      albumType,
      releaseDate,
      found: true,
    };
  } catch (error: any) {
    if (error.response?.status === 429 && retryCount < 3) {
      const retryAfter = error.response.headers['retry-after'] 
        ? parseInt(error.response.headers['retry-after']) * 1000 
        : Math.pow(2, retryCount) * 1000;
      
      await new Promise((resolve) => setTimeout(resolve, retryAfter));
      return searchSpotifyAlbum(artistName, albumName, retryCount + 1);
    }
    
    return { found: false };
  }
}

async function fetchUserYearlyAlbums(
  username: string,
  from: number,
  to: number,
  retryCount = 0
): Promise<Album[]> {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 segundo base, aumenta exponencialmente

  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getweeklyalbumchart&user=${username}&api_key=${API_KEY}&from=${from}&to=${to}&format=json`;
    const response = await axios.get<LastFmResponse>(url, {
      timeout: 30000, // 30 segundos de timeout
    });

    if (!response.data.weeklyalbumchart?.album) {
      console.warn(`⚠️ Nenhum álbum encontrado para ${username} (período: ${new Date(from * 1000).toISOString().split('T')[0]} até ${new Date(to * 1000).toISOString().split('T')[0]})`);
      return [];
    }

    const albums = response.data.weeklyalbumchart.album;
    
    // Verifica se albums é um array
    if (!Array.isArray(albums)) {
      console.warn(`⚠️ Resposta inválida para ${username}: albums não é um array`);
      return [];
    }
    
    console.log(`✅ ${username}: ${albums.length} álbuns retornados pela API`);
    
    return albums;
  } catch (error: any) {
    // Se for erro de timeout ou rate limit, tenta novamente
    if (
      (error.code === 'ECONNABORTED' || 
       error.response?.status === 429 || 
       error.response?.status === 503 ||
       (error.response?.status >= 500 && error.response?.status < 600)) &&
      retryCount < maxRetries
    ) {
      const delay = retryDelay * Math.pow(2, retryCount);
      console.warn(`⚠️ Erro temporário ao buscar álbuns de ${username} (tentativa ${retryCount + 1}/${maxRetries}). Tentando novamente em ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchUserYearlyAlbums(username, from, to, retryCount + 1);
    }
    
    console.error(`❌ Erro ao buscar álbuns de ${username}:`, error.message || error);
    if (error.response) {
      console.error(`❌ Status: ${error.response.status}, Data:`, error.response.data);
    }
    return [];
  }
}

async function getAnnualWeightedRanking(
  from: number,
  to: number
): Promise<AlbumWithUserData[]> {
  const albumPoints = new Map<string, number>();
  const userPoints = new Map<string, { [key: string]: number }>();
  const userPositions = new Map<string, { [key: string]: number }>();
  const albumDisplayNames = new Map<string, string>();
  const processedUsers = new Set<string>();
  const failedUsers: string[] = [];

  console.log(`📊 Processando ${USERS.length} usuários...`);

  // Para cada usuário, busca os álbuns e atribui pontos baseado na porcentagem de plays
  for (let i = 0; i < USERS.length; i++) {
    const user = USERS[i];
    console.log(`🔄 Processando usuário ${i + 1}/${USERS.length}: ${user}`);
    
    try {
      const albums = await fetchUserYearlyAlbums(user, from, to);
      
      // Verifica se recebeu dados válidos
      if (!Array.isArray(albums)) {
        console.error(`❌ ${user}: Resposta inválida - albums não é um array`);
        failedUsers.push(user);
        continue;
      }

      processedUsers.add(user);
      console.log(`✅ ${user}: ${albums.length} álbuns encontrados`);

      // Limita aos top 300 de cada usuário
      const top300Albums = albums.slice(0, 300);
      
      if (top300Albums.length === 0) {
        console.warn(`⚠️ ${user}: Nenhum álbum no top 300`);
        continue;
      }

      // Calcula o total de plays dos top 300 álbuns deste usuário
      const totalPlays = top300Albums.reduce((sum, album) => {
        const plays = parseInt(album.playcount, 10) || 0;
        return sum + plays;
      }, 0);

      if (totalPlays === 0) {
        console.warn(`⚠️ ${user}: Total de plays é zero, pulando...`);
        continue;
      }

      console.log(`📊 ${user}: Total de ${totalPlays.toLocaleString()} plays nos top 300 álbuns`);

      // Para cada álbum, calcula a porcentagem que representa do total
      top300Albums.forEach((album, index) => {
        const position = index + 1;
        const albumPlays = parseInt(album.playcount, 10) || 0;
        
        // Calcula a porcentagem: (plays do álbum / total de plays) * 100
        // Multiplica por 100 e arredonda para cima para ter pontos inteiros
        const percentage = (albumPlays / totalPlays) * 100;
        const points = Math.ceil(percentage * 100);

        // Normaliza o nome do artista
        let normalizedArtistName = album.artist["#text"];
        if (normalizedArtistName.toLowerCase() === "rose gray") {
          normalizedArtistName = "Rose Grey";
        }

        // Normaliza o nome do álbum
        const normalizedAlbumName = normalizeAlbumName(
          album.name,
          normalizedArtistName
        );

        const normalizedKey = `${normalizedArtistName.toLowerCase()} - ${normalizedAlbumName.toLowerCase()}`;
        const displayName = `${normalizedArtistName} - ${normalizedAlbumName}`;

        // Inicializa se não existir
        if (!userPoints.has(normalizedKey)) {
          userPoints.set(normalizedKey, {});
          userPositions.set(normalizedKey, {});
          albumDisplayNames.set(normalizedKey, displayName);
        }

        // Soma os pontos (se o usuário já tiver pontos deste álbum, soma as porcentagens)
        const currentUserPoints = userPoints.get(normalizedKey)!;
        const currentUserPositions = userPositions.get(normalizedKey)!;
        
        // Se o usuário já tem pontos deste álbum, soma os pontos
        if (currentUserPoints[user]) {
          // Soma os novos pontos aos existentes
          const oldPoints = currentUserPoints[user];
          const newPoints = oldPoints + points;
          currentUserPoints[user] = newPoints;
          // Mantém a melhor posição (menor número)
          if (!currentUserPositions[user] || position < currentUserPositions[user]) {
            currentUserPositions[user] = position;
          }
          // Atualiza o total
          albumPoints.set(
            normalizedKey,
            (albumPoints.get(normalizedKey) || 0) - oldPoints + newPoints
          );
        } else {
          // Primeira vez que o usuário aparece com este álbum
          currentUserPoints[user] = points;
          currentUserPositions[user] = position;
          albumPoints.set(
            normalizedKey,
            (albumPoints.get(normalizedKey) || 0) + points
          );
        }
      });
      
      // Adiciona um pequeno delay entre requisições para evitar rate limiting
      if (i < USERS.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } catch (error: any) {
      console.error(`❌ Erro ao processar usuário ${user}:`, error.message || error);
      failedUsers.push(user);
    }
  }
  
  // Log final do processamento
  console.log(`\n📊 Resumo do processamento:`);
  console.log(`✅ Usuários processados com sucesso: ${processedUsers.size}/${USERS.length}`);
  if (failedUsers.length > 0) {
    console.warn(`⚠️ Usuários com falha: ${failedUsers.join(', ')}`);
  }
  
  // Verifica se todos os usuários foram processados
  if (processedUsers.size < USERS.length) {
    console.warn(`⚠️ ATENÇÃO: Apenas ${processedUsers.size} de ${USERS.length} usuários foram processados com sucesso!`);
  }

  // Cria o ranking ordenado por pontos
  // Adiciona 50 pontos para cada ouvinte (usuário) que tem o álbum
  const ranking = Array.from(albumPoints.entries())
    .map(([normalizedKey, totalPoints]) => {
      const albumUserPoints = userPoints.get(normalizedKey) || {};
      // Conta quantos usuários têm pontos neste álbum (ouvintes)
      const listenersCount = Object.keys(albumUserPoints).filter(
        user => albumUserPoints[user] > 0
      ).length;
      
      // Adiciona 50 pontos por ouvinte
      const listenersBonus = listenersCount * 50;
      const finalPoints = totalPoints + listenersBonus;
      
      return {
        album: albumDisplayNames.get(normalizedKey) || normalizedKey,
        normalizedKey,
        totalPoints: finalPoints,
        userPoints: albumUserPoints,
        userPositions: userPositions.get(normalizedKey) || {},
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);

  // Busca informações do Spotify para filtrar singles
  const spotifyInfoMap = new Map<string, SpotifyAlbumInfo>();
  const hasSpotifyCredentials = SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET && 
                                SPOTIFY_CLIENT_ID.length > 0 && SPOTIFY_CLIENT_SECRET.length > 0;
  
  // Verifica os top 300 para filtrar singles (EP e Full Length Album apenas)
  const albumsToCheck = ranking.slice(0, 300);
  
  if (hasSpotifyCredentials && albumsToCheck.length > 0) {
    console.log(`🎵 Spotify: Verificando tipos de álbuns para top ${albumsToCheck.length} álbuns...`);
    
    // Processa em lotes para não sobrecarregar a API
    for (let i = 0; i < albumsToCheck.length; i += 10) {
      const batch = albumsToCheck.slice(i, i + 10);
      
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
      
      if (i + 10 < albumsToCheck.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
    
    const singlesCount = Array.from(spotifyInfoMap.values()).filter(info => info.found && info.albumType === "single").length;
    console.log(`✅ Spotify: ${singlesCount} singles encontrados e serão filtrados`);
  }

  // Filtra singles apenas se tiver credenciais do Spotify configuradas e encontrou o álbum
  const finalRanking = ranking
    .filter((item) => {
      if (!hasSpotifyCredentials) {
        // Sem credenciais, não filtra nada (mantém todos)
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
    .slice(0, 200) // Limita aos primeiros 200 álbuns
    .map((item, index) => {
      const spotifyInfo = spotifyInfoMap.get(item.normalizedKey);
      // Extrai o ano da data de lançamento (formato pode ser YYYY-MM-DD ou YYYY)
      const releaseYear = spotifyInfo?.releaseDate 
        ? spotifyInfo.releaseDate.split('-')[0] 
        : undefined;
      
      return {
        rank: index + 1,
        album: item.album,
        totalPoints: item.totalPoints,
        userPoints: item.userPoints,
        userPositions: item.userPositions,
        normalizedKey: item.normalizedKey,
        releaseDate: releaseYear,
      };
    });

  return finalRanking;
}

export async function GET(request: Request) {
  console.log("Calculando ranking anual ponderado de álbuns");

  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");

    if (!year) {
      return NextResponse.json(
        { error: "Parâmetro 'year' é obrigatório" },
        { status: 400 }
      );
    }

    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum)) {
      return NextResponse.json(
        { error: "Ano inválido" },
        { status: 400 }
      );
    }

    const currentYear = new Date().getFullYear();
    const currentDate = new Date();

    // Se for o ano atual, calcula até a data atual
    // Se for um ano passado, calcula o ano completo (1/1 até 31/12)
    let fromDate: Date;
    let toDate: Date;

    if (yearNum === currentYear) {
      // Ano atual: de 1/1 até hoje
      fromDate = new Date(yearNum, 0, 1); // 1 de janeiro
      toDate = currentDate;
    } else if (yearNum < currentYear) {
      // Ano passado: ano completo
      fromDate = new Date(yearNum, 0, 1); // 1 de janeiro
      toDate = new Date(yearNum, 11, 31, 23, 59, 59); // 31 de dezembro
    } else {
      // Ano futuro: não permitido
      return NextResponse.json(
        { error: "Ano futuro não permitido" },
        { status: 400 }
      );
    }

    const from = Math.floor(fromDate.getTime() / 1000);
    const to = Math.floor(toDate.getTime() / 1000);

    console.log(`Calculando ranking para o ano ${yearNum}: ${fromDate.toISOString().split('T')[0]} até ${toDate.toISOString().split('T')[0]}`);

    const ranking = await getAnnualWeightedRanking(from, to);
    console.log(`✅ Ranking anual ponderado: ${ranking.length} álbuns processados`);

    return NextResponse.json(ranking);
  } catch (error) {
    console.error("Erro na API:", error);
    return NextResponse.json(
      { error: "Erro ao processar a requisição" },
      { status: 500 }
    );
  }
}

