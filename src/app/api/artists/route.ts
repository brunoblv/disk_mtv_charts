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
  score: number;
  userPlays: { [key: string]: number };
  userScores: { [key: string]: number };
  listenersBonus: number;
  image?: string;
}

interface SpotifyArtistInfo {
  image?: string;
  found: boolean;
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
 * Busca informações do artista no Spotify
 */
async function searchSpotifyArtist(
  artistName: string,
  retryCount = 0
): Promise<SpotifyArtistInfo> {
  const token = await getSpotifyToken();
  if (!token) {
    return { found: false };
  }

  try {
    const cleanArtistName = artistName.trim();
    
    const response = await axios.get("https://api.spotify.com/v1/search", {
      params: {
        q: `artist:"${cleanArtistName}"`,
        type: "artist",
        limit: 5,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const artists = response.data.artists?.items || [];

    if (artists.length === 0) {
      return { found: false };
    }

    // Procura o melhor match
    const normalizedArtistName = cleanArtistName.toLowerCase();
    
    let bestMatch = artists[0];
    let bestScore = 0;

    for (const artist of artists) {
      const artistNameLower = artist.name?.toLowerCase() || "";
      
      // Verifica se o nome corresponde exatamente ou parcialmente
      const exactMatch = artistNameLower === normalizedArtistName;
      const partialMatch = artistNameLower.includes(normalizedArtistName) || 
                          normalizedArtistName.includes(artistNameLower);
      
      let score = 0;
      if (exactMatch) score = 10;
      else if (partialMatch) score = 5;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = artist;
      }
    }

    // Só retorna se houver match razoável
    if (bestScore === 0) {
      return { found: false };
    }

    // Pega a imagem de maior resolução disponível
    const images = bestMatch.images || [];
    const image = images.length > 0 ? images[0].url : undefined;

    return {
      image: image,
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
      return searchSpotifyArtist(artistName, retryCount + 1);
    }
    
    console.error(
      `Erro ao buscar artista no Spotify: ${artistName}`,
      error.response?.status || error.message
    );
    return { found: false };
  }
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
  const artistDisplayNames = new Map<string, string>(); // Armazena o nome de exibição original

  for (const user of USERS) {
    const artists = await fetchUserWeeklyArtists(user, from, to);

    for (const artist of artists) {
      const artistName = artist.name;
      
      // Normaliza para lowercase para agrupar variações de capitalização
      const normalizedKey = artistName.toLowerCase();
      
      // Mantém o nome original para exibição
      const displayName = artistName;
      
      const plays = parseInt(artist.playcount, 10);

      // Atualiza os plays por usuário (soma se o usuário já tiver plays deste artista)
      if (!userPlays.has(normalizedKey)) {
        userPlays.set(normalizedKey, {});
      }
      const currentUserPlays = userPlays.get(normalizedKey)!;
      // Soma os plays em vez de substituir (para casos onde o usuário ouviu o mesmo artista múltiplas vezes)
      currentUserPlays[user] = (currentUserPlays[user] || 0) + plays;
      
      // Armazena o nome de exibição (usa o primeiro encontrado ou mantém o existente)
      if (!artistDisplayNames.has(normalizedKey)) {
        artistDisplayNames.set(normalizedKey, displayName);
      }
    }
  }

  // Aplica o limite máximo por usuário e calcula os totais após processar todos os usuários
  const artistScores = new Map<string, { plays: number; score: number; userScores: { [key: string]: number }; listenersBonus: number }>();
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

    artistCounts.set(normalizedKey, totalPlays);
    artistScores.set(normalizedKey, { plays: totalPlays, score, userScores, listenersBonus });
  }

  const ranking = Array.from(artistCounts.entries())
    .map(([normalizedKey, plays]) => {
      const scoreData = artistScores.get(normalizedKey);
      const displayName = artistDisplayNames.get(normalizedKey) || normalizedKey;
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
    .sort((a, b) => b.score - a.score) // Ordena por score em vez de plays
    .map((item, index) => ({
      rank: index + 1,
      artist: item.name,
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

  // Busca informações do Spotify para cada artista do ranking
  // Limita aos top 50 para economizar requisições da API do Spotify e acelerar a resposta
  const spotifyInfoMap = new Map<string, SpotifyArtistInfo>();
  const top50Artists = ranking.slice(0, 50);

  // Só busca no Spotify se tiver credenciais configuradas
  const hasSpotifyCredentials = !!SPOTIFY_CLIENT_ID && !!SPOTIFY_CLIENT_SECRET;
  
  if (hasSpotifyCredentials && top50Artists.length > 0) {
    console.log(`🎵 Spotify: Buscando imagens para top ${top50Artists.length} artistas...`);
    
    // Processa em lotes maiores e com menos delay para acelerar
    for (let i = 0; i < top50Artists.length; i += 10) {
      const batch = top50Artists.slice(i, i + 10);
      
      // Processa em paralelo dentro do lote para acelerar
      const promises = batch.map(async (artistItem) => {
        const spotifyInfo = await searchSpotifyArtist(artistItem.artist);
        return { normalizedKey: artistItem.normalizedKey, spotifyInfo };
      });
      
      const results = await Promise.all(promises);
      results.forEach(({ normalizedKey, spotifyInfo }) => {
        spotifyInfoMap.set(normalizedKey, spotifyInfo);
      });
      
      // Delay menor entre lotes (apenas se não for o último lote)
      if (i + 10 < top50Artists.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
    
    const foundCount = Array.from(spotifyInfoMap.values()).filter(info => info.found).length;
    const withImageCount = Array.from(spotifyInfoMap.values()).filter(info => info.image).length;
    console.log(`✅ Spotify: ${foundCount} encontrados, ${withImageCount} com imagem`);
  }

  // Adiciona informações do Spotify ao ranking
  const finalRanking = ranking.map((item) => {
    const spotifyInfo = spotifyInfoMap.get(item.normalizedKey) || { found: false };
    return {
      ...item,
      image: spotifyInfo.image,
    };
  });

  return finalRanking;
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

  // Converte as datas para timestamps Unix
  // Data inicial: início do dia (00:00:00)
  const from = Math.floor(new Date(startDate + "T00:00:00").getTime() / 1000);
  // Data final: fim do dia (23:59:59) para incluir todos os plays do dia
  const to = Math.floor(new Date(endDate + "T23:59:59").getTime() / 1000);

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
