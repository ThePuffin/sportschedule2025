import { FilterGames, GameFormatted, Team } from '@/utils/types';
import * as fflate from 'fflate';

const EXPO_PUBLIC_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://sportschedule2025backend.onrender.com';

type TeamGamesCacheEntry = {
  data: FilterGames;
  timestamp: number;
};

type TeamGamesCache = Record<string, TeamGamesCacheEntry>;

const TEAM_GAMES_CACHE_KEY = 'games_team_map';
const TEAM_GAMES_CACHE_TTL_HOURS = 0.1;
const TEAM_GAMES_CACHE_TTL_MS = TEAM_GAMES_CACHE_TTL_HOURS * 60 * 60 * 1000;

let teamGamesCacheStore: TeamGamesCache | null = null;

const loadTeamGamesCache = (): TeamGamesCache => {
  if (!teamGamesCacheStore) {
    teamGamesCacheStore = getCache<TeamGamesCache>(TEAM_GAMES_CACHE_KEY) ?? {};
    pruneTeamGamesCache(teamGamesCacheStore);
    saveCache(TEAM_GAMES_CACHE_KEY, teamGamesCacheStore);
  }
  return teamGamesCacheStore;
};

const persistTeamGamesCache = (cache: TeamGamesCache): void => {
  teamGamesCacheStore = cache;
  pruneTeamGamesCache(teamGamesCacheStore);
  saveCache(TEAM_GAMES_CACHE_KEY, teamGamesCacheStore);
};

const pruneTeamGamesCache = (cache: TeamGamesCache): void => {
  const now = Date.now();
  for (const teamId of Object.keys(cache)) {
    if (now - cache[teamId].timestamp >= TEAM_GAMES_CACHE_TTL_MS) {
      delete cache[teamId];
    }
  }
};

const isTeamGamesEntryFresh = (entry?: TeamGamesCacheEntry): entry is TeamGamesCacheEntry => {
  if (!entry) return false;
  return Date.now() - entry.timestamp < TEAM_GAMES_CACHE_TTL_MS;
};

// Helper to check if cache is still valid (less than 1 hours old or defined maxDuration)
const isCacheValid = (cacheKey: string, maxDuration: number = 1): boolean => {
  const timestamp = localStorage.getItem(`${cacheKey}_timestamp`);
  if (!timestamp) return false;
  const cached = Number.parseInt(timestamp, 10);
  const now = Date.now();
  const oneDayMs = maxDuration * 60 * 60 * 1000;
  return now - cached < oneDayMs;
};

// Helper to save data with timestamp and compression
export const saveCache = (cacheKey: string, data: unknown): void => {
  const jsonString = JSON.stringify(data);
  const compressed = fflate.compressSync(fflate.strToU8(jsonString));
  // Use strFromU8 with true to create a binary string for localStorage
  const storableString = fflate.strFromU8(compressed, true);
  localStorage.setItem(cacheKey, storableString);
  localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
};

// Helper to get cached and decompressed data
export const getCache = <T>(cacheKey: string): T | null => {
  const storableString = localStorage.getItem(cacheKey);
  if (!storableString) return null;
  try {
    // Use strToU8 with true to convert binary string back to Uint8Array
    const compressed = fflate.strToU8(storableString, true);
    const decompressed = fflate.decompressSync(compressed);
    const jsonString = fflate.strFromU8(decompressed);
    return JSON.parse(jsonString) as T;
  } catch (e) {
    console.error(`Failed to parse or decompress cache for ${cacheKey}`, e);
    // Clear corrupted cache
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(`${cacheKey}_timestamp`);
    return null;
  }
};

const isCacheContentValid = (data: unknown): boolean => {
  if (data === null || data === undefined) return false;
  if (Array.isArray(data)) return data.length > 0;
  if (typeof data === 'object') return Object.keys(data as object).length > 0;
  return true;
};

// Helper to add timeout to fetch (accepts RequestInit options)
const fetchWithTimeout = (url: string, timeoutMs: number = 6000, options: RequestInit = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const mergedOptions: RequestInit = { ...options, signal: controller.signal };

  return fetch(url, mergedOptions)
    .then((res) => {
      clearTimeout(timeout);
      return res;
    })
    .catch((error) => {
      clearTimeout(timeout);
      throw error;
    });
};

const fetchWithCacheStrategy = async <T>(
  url: string,
  cacheKey: string | null,
  emptyValue: T,
  customGetCache?: () => T | null,
  customSaveCache?: (data: T) => void,
  retryTimeout: number = 10000,
): Promise<T> => {
  try {
    const res = await fetchWithTimeout(url, 5000);
    const data = (await res.json()) as T;
    if (cacheKey) saveCache(cacheKey, data);
    if (customSaveCache) customSaveCache(data);
    return data;
  } catch (error) {
    console.warn(`Fetch failed for ${url} (5s). Checking cache...`);

    let cached: T | null = null;
    if (customGetCache) {
      cached = customGetCache();
    } else if (cacheKey) {
      cached = getCache<T>(cacheKey);
    }

    if (isCacheContentValid(cached)) {
      console.info(`Using cached data for ${url} due to fetch failure.`);
      return cached!;
    }

    console.warn(`Cache invalid for ${url}. Retrying in 10s...`);
    await new Promise((resolve) => setTimeout(resolve, 10000));

    try {
      const res = await fetchWithTimeout(url, retryTimeout);
      const data = (await res.json()) as T;
      if (cacheKey) saveCache(cacheKey, data);
      if (customSaveCache) customSaveCache(data);
      return data;
    } catch (retryError) {
      console.error(`Retry failed for ${url}`, retryError);
      return emptyValue;
    }
  }
};

export const fetchGamesByHour = async (date: string): Promise<{ [key: string]: GameFormatted[] }> => {
  const cacheKey = `games_hour_${date}`;

  if (isCacheValid(cacheKey, 2 / 60)) {
    const cached = getCache<{ [key: string]: GameFormatted[] }>(cacheKey);
    if (cached) return cached;
  }

  return fetchWithCacheStrategy<{ [key: string]: GameFormatted[] }>(
    `${EXPO_PUBLIC_API_BASE_URL}/games/hour/${date}`,
    cacheKey,
    {},
  );
};

export const fetchLeagues = async (setLeaguesAvailable: (leagues: string[]) => void) => {
  const cacheKey = 'leagues';

  if (isCacheValid(cacheKey)) {
    const cached = getCache<string[]>(cacheKey);
    if (cached) {
      console.info('Using cached leagues');
      setLeaguesAvailable(cached);
      return cached;
    }
  }

  const data = await fetchWithCacheStrategy<string[]>(
    `${EXPO_PUBLIC_API_BASE_URL}/teams/leagues`,
    cacheKey,
    [],
    undefined,
    undefined,
    60000,
  );
  setLeaguesAvailable(data);
  return data;
};

export const fetchTeams = async () => {
  const cacheKey = 'teams';

  if (isCacheValid(cacheKey, 0.1)) {
    const cached = getCache<Team[]>(cacheKey);
    if (cached) {
      console.info('Using cached teams');
      return cached;
    }
  }

  return fetchWithCacheStrategy<Team[]>(`${EXPO_PUBLIC_API_BASE_URL}/teams`, cacheKey, [], undefined, undefined, 60000);
};

export const fetchRemainingGamesByTeam = async (teamSelected: string) => {
  const teamGamesCache = loadTeamGamesCache();
  const cachedEntry = teamGamesCache[teamSelected];

  if (isTeamGamesEntryFresh(cachedEntry)) {
    console.info(`Using cached games for team ${teamSelected}`);
    return cachedEntry.data;
  }

  return fetchWithCacheStrategy<FilterGames>(
    `${EXPO_PUBLIC_API_BASE_URL}/games/team/${teamSelected}`,
    null,
    {},
    () => teamGamesCache[teamSelected]?.data || null,
    (data) => {
      teamGamesCache[teamSelected] = { data, timestamp: Date.now() };
      persistTeamGamesCache(teamGamesCache);
    },
    60000,
  );
};

export const fetchRemainingGamesByLeague = async (league: string, limit?: number) => {
  const cacheKey = `games_league_${league}${limit ? `_${limit}` : ''}`;

  let url = `${EXPO_PUBLIC_API_BASE_URL}/games/league/${league}`;
  if (limit) {
    url += `?maxResults=${limit}`;
  }

  return fetchWithCacheStrategy<FilterGames>(url, cacheKey, {}, undefined, undefined, 60000);
};

export const smallFetchRemainingGamesByLeague = async (league: string) => {
  return fetchRemainingGamesByLeague(league, 50);
};

export const refreshGamesLeague = async (league: string): Promise<void> => {
  try {
    await fetchWithTimeout(`${EXPO_PUBLIC_API_BASE_URL}/games/refresh/${league.toUpperCase()}`, 60000, {
      method: 'POST',
    }).then(() => null);
    return;
  } catch (error) {
    console.error(`Error refreshing games for league ${league}:`, error);
    return;
  }
};

export const refreshTeams = async (endpoint: string): Promise<void> => {
  try {
    await fetchWithTimeout(`${EXPO_PUBLIC_API_BASE_URL}/${endpoint}`, 60000, { method: 'POST' }).then(() => null);
    return;
  } catch (error) {
    console.error(`Error refreshing teams:`, error);
    return;
  }
};

export const fetchGames = async (date: string): Promise<GameFormatted[]> => {
  date = date || new Date().toISOString().split('T')[0];
  return fetchWithCacheStrategy<GameFormatted[]>(
    `${EXPO_PUBLIC_API_BASE_URL}/games/date/${date}`,
    null,
    [],
    undefined,
    undefined,
    10000,
  );
};

export const fetchDateRangeFromApi = async () => {
  try {
    const cacheKey = 'date_range_limits';

    if (isCacheValid(cacheKey, 24)) {
      const cached = getCache<{ minDate: string | null; maxDate: string | null }>(cacheKey);
      if (cached && cached.minDate && cached.maxDate) return cached;
    }

    const dates = await fetchWithCacheStrategy<{ minDate: string | null; maxDate: string | null }>(
      `${EXPO_PUBLIC_API_BASE_URL}/games/dates/range`,
      cacheKey,
      { minDate: null, maxDate: null },
      undefined,
      undefined,
      60000,
    );
    return dates;
  } catch (error) {
    console.error('Error fetching date range from API:', error);
  }
};
