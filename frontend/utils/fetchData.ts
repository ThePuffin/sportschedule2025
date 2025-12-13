import { FilterGames, Team } from '@/utils/types';
import * as fflate from 'fflate';

const EXPO_PUBLIC_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://sportschedule2025backend.onrender.com';

// Helper to check if cache is still valid (less than 1 hours old or defined maxDuration)
const isCacheValid = (cacheKey: string, maxDuration: number = 1): boolean => {
  const timestamp = localStorage.getItem(`${cacheKey}_timestamp`);
  if (!timestamp) return false;
  const cached = parseInt(timestamp, 10);
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

// Helper function to retry after delay
const retryFetch = async <T>(fetchFn: () => Promise<T>, retries: number = 1, delayMs: number = 10000): Promise<T> => {
  try {
    return await fetchFn();
  } catch (error) {
    if (retries > 0) {
      console.warn(`Retry in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return retryFetch(fetchFn, retries - 1, delayMs);
    }
    throw error;
  }
};

// Helper to add timeout to fetch
const fetchWithTimeout = (url: string, timeoutMs: number = 10000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { signal: controller.signal })
    .then((res) => {
      clearTimeout(timeout);
      return res;
    })
    .catch((error) => {
      clearTimeout(timeout);
      throw error;
    });
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

  try {
    const leagues = await retryFetch(() =>
      fetchWithTimeout(`${EXPO_PUBLIC_API_BASE_URL}/teams/leagues`).then((res) => res.json() as Promise<string[]>)
    );
    setLeaguesAvailable(leagues);
    saveCache(cacheKey, leagues);
    return leagues;
  } catch (error: unknown) {
    console.error('Error fetching leagues:', error);
    // Fallback to stale cache if available
    const staleCache = getCache<string[]>(cacheKey);
    if (staleCache) {
      setLeaguesAvailable(staleCache);
      return staleCache;
    }
    return [];
  }
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

  try {
    const teams = await retryFetch(() =>
      fetchWithTimeout(`${EXPO_PUBLIC_API_BASE_URL}/teams`).then((res) => res.json() as Promise<Team[]>)
    );
    saveCache(cacheKey, teams);
    return teams;
  } catch (error: unknown) {
    console.error('Error fetching teams:', error);
    // Fallback to stale cache if available
    const staleCache = getCache<Team[]>(cacheKey);
    if (staleCache) return staleCache;
    return [];
  }
};

export const fetchRemainingGamesByTeam = async (teamSelected: string) => {
  const cacheKey = `games_team_${teamSelected}`;

  if (isCacheValid(cacheKey, 0.1)) {
    const cached = getCache<FilterGames>(cacheKey);
    if (cached) {
      console.info(`Using cached games for team ${teamSelected}`);
      return cached;
    }
  }

  try {
    const games = await retryFetch(async () => {
      const response = await fetchWithTimeout(`${EXPO_PUBLIC_API_BASE_URL}/games/team/${teamSelected}`, 60000);
      return (await response.json()) || {};
    });
    saveCache(cacheKey, games);
    return games;
  } catch (error) {
    console.error('Error fetching remaining games by team:', error);
    // Fallback to stale cache if available
    const staleCache = getCache<FilterGames>(cacheKey);
    if (staleCache) return staleCache;
    return {};
  }
};

export const fetchRemainingGamesByLeague = async (league: string, limit?: number) => {
  const cacheKey = `games_league_${league}${limit ? `_${limit}` : ''}`;

  try {
    let url = `${EXPO_PUBLIC_API_BASE_URL}/games/league/${league}`;
    if (limit) {
      url += `?maxResults=${limit}`;
    }
    const data = await retryFetch(() => fetchWithTimeout(url).then((res) => res.json() as Promise<FilterGames>));
    return data;
  } catch (error: unknown) {
    console.error('Error fetching remaining games by league:', error);
    // Fallback to stale cache if available
    const staleCache = getCache<FilterGames>(cacheKey);
    if (staleCache) return staleCache;
    return {};
  }
};

export const smallFetchRemainingGamesByLeague = async (league: string) => {
  return fetchRemainingGamesByLeague(league, 50);
};
