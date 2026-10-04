import {
  FilterGames,
  GameFormatted,
  LeagueDayGroup,
  Team,
} from "@/utils/types";
import * as fflate from "fflate";

const EXPO_PUBLIC_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "https://sportschedule2025backend.onrender.com";

type TeamGamesCacheEntry = {
  data: FilterGames;
  timestamp: number;
};

type TeamGamesCache = Record<string, TeamGamesCacheEntry>;

const TEAM_GAMES_CACHE_KEY = "games_team_map";
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

const isTeamGamesEntryFresh = (
  entry?: TeamGamesCacheEntry,
): entry is TeamGamesCacheEntry => {
  if (!entry) return false;
  return Date.now() - entry.timestamp < TEAM_GAMES_CACHE_TTL_MS;
};

// Helper to check if cache is still valid (less than 1 hours old or defined maxDuration)
const isCacheValid = (
  cacheKey: string,
  maxDuration: number = 1,
  storage: Storage = localStorage,
): boolean => {
  const timestamp = storage.getItem(`${cacheKey}_timestamp`);
  if (!timestamp) return false;
  const cached = Number.parseInt(timestamp, 10);
  const now = Date.now();
  const oneDayMs = maxDuration * 60 * 60 * 1000;
  return now - cached < oneDayMs;
};

// Helper to save data with timestamp and compression
export const saveCache = (
  cacheKey: string,
  data: unknown,
  storage: Storage = localStorage,
): void => {
  const jsonString = JSON.stringify(data);
  const compressed = fflate.compressSync(fflate.strToU8(jsonString));
  // Use strFromU8 with true to create a binary string for localStorage
  const storableString = fflate.strFromU8(compressed, true);
  storage.setItem(cacheKey, storableString);
  storage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
};

// Helper to get cached and decompressed data
export const getCache = <T>(
  cacheKey: string,
  storage: Storage = localStorage,
): T | null => {
  const storableString = storage.getItem(cacheKey);
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
    storage.removeItem(cacheKey);
    storage.removeItem(`${cacheKey}_timestamp`);
    return null;
  }
};

const isCacheContentValid = (data: unknown): boolean => {
  if (data === null || data === undefined) return false;
  if (Array.isArray(data)) return data.length > 0;
  if (typeof data === "object") return Object.keys(data).length > 0;
  return true;
};

// Helper to add timeout to fetch (accepts RequestInit options)
const fetchWithTimeout = (
  url: string,
  timeoutMs: number = 6000,
  options: RequestInit = {},
) => {
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
  storage: Storage = localStorage,
): Promise<T> => {
  try {
    const res = await fetchWithTimeout(url, 5000);
    const data = (await res.json()) as T;
    if (cacheKey) saveCache(cacheKey, data, storage);
    if (customSaveCache) customSaveCache(data);
    return data;
  } catch {
    console.warn(`Fetch failed for ${url} (5s). Checking cache...`);

    let cached: T | null = null;
    if (customGetCache) {
      cached = customGetCache();
    } else if (cacheKey) {
      cached = getCache<T>(cacheKey, storage);
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
      if (cacheKey) saveCache(cacheKey, data, storage);
      if (customSaveCache) customSaveCache(data);
      return data;
    } catch (retryError) {
      console.error(`Retry failed for ${url}`, retryError);
      return emptyValue;
    }
  }
};

export const fetchGamesByHour = async (
  date: string,
  limit?: number,
  skip?: number,
): Promise<{ [key: string]: GameFormatted[] }> => {
  const leaguesSelected = getCache<string[]>("leaguesSelected") || [];
  let cacheKey = `games_hour_${date}`;
  let url = `${EXPO_PUBLIC_API_BASE_URL}/games/hour/${date}`;

  const params = new URLSearchParams();

  if (leaguesSelected?.length > 0) {
    const leaguesParam = leaguesSelected.join("+");
    params.append("leagues", leaguesParam);
    cacheKey += `_${leaguesParam}`;
  }

  if (limit) {
    params.append("maxResults", limit.toString());
    cacheKey += `_limit_${limit}`;
  }
  if (skip) {
    params.append("skip", skip.toString());
    cacheKey += `_skip_${skip}`;
  }

  if (params.toString()) url += `?${params.toString()}`;

  if (isCacheValid(cacheKey, 2 / 60, sessionStorage)) {
    const cached = getCache<{ [key: string]: GameFormatted[] }>(
      cacheKey,
      sessionStorage,
    );
    if (cached) return cached;
  }

  return fetchWithCacheStrategy<{ [key: string]: GameFormatted[] }>(
    url,
    cacheKey,
    {},
    undefined,
    undefined,
    100000,
    sessionStorage,
  );
};

export const fetchGamesByLeagueDay = async (
  date: string,
  limit?: number,
  skip?: number,
  favoriteTeams?: string[],
): Promise<LeagueDayGroup[]> => {
  const leaguesSelected = getCache<string[]>("leaguesSelected") || [];
  let cacheKey = `games_league_day_${date}`;
  let url = `${EXPO_PUBLIC_API_BASE_URL}/games/league-day/${date}`;

  const params = new URLSearchParams();

  if (leaguesSelected?.length > 0) {
    const leaguesParam = leaguesSelected.join("+");
    params.append("leagues", leaguesParam);
    cacheKey += `_${leaguesParam}`;
  }

  if (limit) {
    params.append("maxResults", limit.toString());
    cacheKey += `_limit_${limit}`;
  }
  if (skip) {
    params.append("skip", skip.toString());
    cacheKey += `_skip_${skip}`;
  }

  const favoriteTeamsParam = (favoriteTeams || []).filter(Boolean);
  if (favoriteTeamsParam.length > 0) {
    const favorites = favoriteTeamsParam.join("+");
    params.append("favoriteTeams", favorites);
    cacheKey += `_fav_${favorites}`;
  }

  if (params.toString()) url += `?${params.toString()}`;

  if (isCacheValid(cacheKey, 2 / 60, sessionStorage)) {
    const cached = getCache<{ groups: LeagueDayGroup[] }>(
      cacheKey,
      sessionStorage,
    );
    if (cached) return cached.groups ?? [];
  }

  const data = await fetchWithCacheStrategy<{ groups: LeagueDayGroup[] }>(
    url,
    cacheKey,
    { groups: [] },
    undefined,
    undefined,
    100000,
    sessionStorage,
  );

  return data?.groups ?? [];
};

export const fetchLeagues = async (
  setLeaguesAvailable: (leagues: string[]) => void,
) => {
  const cacheKey = "leagues";

  if (isCacheValid(cacheKey, 24)) {
    const cached = getCache<string[]>(cacheKey);
    if (cached) {
      console.info("Using cached leagues");
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
  const cacheKey = "teams";

  if (isCacheValid(cacheKey, 24)) {
    const cached = getCache<Team[]>(cacheKey);
    if (cached) {
      console.info("Using cached teams");
      return cached;
    }
  }

  return fetchWithCacheStrategy<Team[]>(
    `${EXPO_PUBLIC_API_BASE_URL}/teams`,
    cacheKey,
    [],
    undefined,
    undefined,
    60000,
  );
};

export const fetchRemainingGamesByTeam = async (
  teamSelected: string,
  startDate?: string,
) => {
  const teamGamesCache = loadTeamGamesCache();
  const cachedEntry = teamGamesCache[teamSelected];

  if (!startDate && isTeamGamesEntryFresh(cachedEntry)) {
    console.info(`Using cached games for team ${teamSelected}`);
    return cachedEntry.data;
  }

  let url = `${EXPO_PUBLIC_API_BASE_URL}/games/team/${teamSelected}?clean=true`;
  if (startDate) {
    url += `&startDate=${startDate}`;
  }

  return fetchWithCacheStrategy<FilterGames>(
    url,
    null,
    {},
    // Custom getter: only provide a fallback from cache if no startDate was given.
    () => {
      if (startDate) {
        return null; // Don't use cache if filtering by date
      }
      return teamGamesCache[teamSelected]?.data || null;
    },
    // Custom setter: only save to cache if we fetched the full schedule (no startDate).
    (data) => {
      if (!startDate) {
        teamGamesCache[teamSelected] = { data, timestamp: Date.now() };
        persistTeamGamesCache(teamGamesCache);
      }
    },
    60000,
  );
};

/**
 * Cache budget for the form dots. A game already played never changes, so the
 * row of a past game can be trusted for a whole day. The row of an upcoming
 * game still gains new results as other games finish, so it is re-checked every
 * few minutes.
 */
const RECENT_FORM_PAST_CACHE_HOURS = 24;
const RECENT_FORM_UPCOMING_CACHE_HOURS = 5 / 60;
/**
 * Versioned: bumped to `v2` when the endpoint started collapsing the double
 * stored copies of a single match. Past rows live in the cache for 24 h, so
 * keeping the un-versioned key would have kept serving the duplicated dots for
 * a whole day after the fix.
 */
const RECENT_FORM_CACHE_PREFIX = "recent_form_v2";

/**
 * Last finished games of a team, for the modal's form dots.
 *
 * `before` is only passed for a game already played, and is that game's own ISO
 * start: the row then shows the games played just before it. It is left
 * undefined for an upcoming game, which makes the backend return the team's
 * most recent played games (an unplayed game carries no score and is filtered
 * server-side). Omitting it also keeps the URL — and therefore the cache key
 * built from it — identical across opens; a `now` bound would carry
 * milliseconds and defeat the cache entirely.
 */
export const fetchRecentFormGames = async (
  teamSelected: string,
  before?: string,
  limit = 5,
) => {
  if (!teamSelected) return [];

  const parsedBefore = before ? Date.parse(before) : Number.NaN;
  const beforeIso = Number.isNaN(parsedBefore)
    ? null
    : new Date(parsedBefore).toISOString();

  const params = [`limit=${limit}`];
  if (beforeIso) params.push(`before=${encodeURIComponent(beforeIso)}`);
  const url = `${EXPO_PUBLIC_API_BASE_URL}/games/team/${teamSelected}/form?${params.join("&")}`;

  const cacheKey = `${RECENT_FORM_CACHE_PREFIX}_${teamSelected}_${limit}_${beforeIso ?? "latest"}`;
  const ttlHours = beforeIso
    ? RECENT_FORM_PAST_CACHE_HOURS
    : RECENT_FORM_UPCOMING_CACHE_HOURS;

  if (isCacheValid(cacheKey, ttlHours)) {
    const cached = getCache<GameFormatted[]>(cacheKey);
    if (cached) return cached;
  }

  const games = await fetchWithCacheStrategy<GameFormatted[]>(
    url,
    null,
    [],
    undefined,
    undefined,
    60000,
  );

  // An empty row is never cached: a team without stored history must not stay
  // blank for a whole day once its first result lands.
  if (isCacheContentValid(games)) saveCache(cacheKey, games);
  return games;
};

export const fetchResultsByTeam = async (
  teamSelected: string,
  startDate?: string,
) => {
  let url = `${EXPO_PUBLIC_API_BASE_URL}/games/team/${teamSelected}/results`;
  if (startDate) {
    url += `?startDate=${startDate}`;
  }
  return fetchWithCacheStrategy<FilterGames>(
    url,
    null,
    {},
    undefined,
    undefined,
    60000,
  );
};

export const fetchResultsByLeague = async (
  league: string,
  startDate?: string,
  maxResults?: number,
) => {
  let url = `${EXPO_PUBLIC_API_BASE_URL}/games/league/${league}/results`;
  if (startDate) {
    url += `?startDate=${startDate}`;
  }
  if (maxResults) {
    url += `${url.includes("?") ? "&" : "?"}maxResults=${maxResults}`;
  }
  return fetchWithCacheStrategy<FilterGames>(
    url,
    null,
    {},
    undefined,
    undefined,
    60000,
  );
};

export const fetchRemainingGamesByLeague = async (
  league: string,
  limit?: number,
  skip?: number,
  startDate?: string,
  isHome?: boolean,
) => {
  let cacheKey = `games_league_${league}`;
  if (limit) {
    cacheKey += `_${limit}`;
  }
  if (skip) {
    cacheKey += `_skip_${skip}`;
  }
  if (startDate) {
    cacheKey += `_${startDate}`;
  }
  if (isHome) {
    cacheKey += `_home`;
  }

  let url = `${EXPO_PUBLIC_API_BASE_URL}/games/league/${league}`;
  const params = new URLSearchParams();
  if (limit) {
    params.append("maxResults", limit.toString());
  }
  if (skip) {
    params.append("skip", skip.toString());
  }
  if (startDate) {
    params.append("startDate", startDate);
  }
  if (isHome) {
    params.append("isHome", "true");
  }
  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  return fetchWithCacheStrategy<FilterGames>(
    url,
    cacheKey,
    {},
    undefined,
    undefined,
    60000,
  );
};

export const smallFetchRemainingGamesByLeague = async (league: string) => {
  return fetchRemainingGamesByLeague(league, 50, undefined, undefined, true);
};

export const refreshGamesLeague = async (league: string): Promise<void> => {
  try {
    await fetchWithTimeout(
      `${EXPO_PUBLIC_API_BASE_URL}/games/refresh/${league.toUpperCase()}`,
      60000,
      {
        method: "POST",
      },
    ).then(() => null);
    return;
  } catch (error) {
    console.error(`Error refreshing games for league ${league}:`, error);
    return;
  }
};

export const refreshTeams = async (endpoint: string): Promise<void> => {
  try {
    await fetchWithTimeout(`${EXPO_PUBLIC_API_BASE_URL}/${endpoint}`, 60000, {
      method: "POST",
    }).then(() => null);
    return;
  } catch (error) {
    console.error(`Error refreshing teams:`, error);
    return;
  }
};

export const fetchGames = async (date: string): Promise<GameFormatted[]> => {
  date = date || new Date().toISOString().split("T")[0];
  return fetchWithCacheStrategy<GameFormatted[]>(
    `${EXPO_PUBLIC_API_BASE_URL}/games/date/${date}`,
    null,
    [],
    undefined,
    undefined,
    10000,
  );
};

export const fetchLiveScores = async (
  gameIds: string[],
): Promise<GameFormatted[]> => {
  if (gameIds.length === 0) return [];

  try {
    const res = await fetchWithTimeout(
      `${EXPO_PUBLIC_API_BASE_URL}/games/live`,
      15000,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ gameIds }),
      },
    );

    if (res.ok) {
      return (await res.json()) as GameFormatted[];
    }
    return [];
  } catch (error) {
    console.error("Error fetching live scores:", error);
    return [];
  }
};

export const fetchClosestDates = async (params: {
  league?: string;
  teamSelectedId?: string;
  date?: string;
}): Promise<{ previousDate: string | null; nextDate: string | null }> => {
  const query = new URLSearchParams();
  if (params.league) {
    query.append("leagues", params.league);
  }
  if (params.teamSelectedId) {
    query.append("teamSelectedIds", params.teamSelectedId);
  }
  if (params.date) {
    query.append("date", params.date);
  }
  const qs = query.toString();
  return fetchWithCacheStrategy<{
    previousDate: string | null;
    nextDate: string | null;
  }>(
    `${EXPO_PUBLIC_API_BASE_URL}/games/dates/closest${qs ? `?${qs}` : ""}`,
    null,
    { previousDate: null, nextDate: null },
    undefined,
    undefined,
    10000,
  );
};

export const fetchDateRangeFromApi = async () => {
  try {
    const cacheKey = "date_range_limits";

    if (isCacheValid(cacheKey, 24)) {
      const cached = getCache<{
        minDate: string | null;
        maxDate: string | null;
      }>(cacheKey);
      if (cached?.minDate && cached?.maxDate) return cached;
    }

    const dates = await fetchWithCacheStrategy<{
      minDate: string | null;
      maxDate: string | null;
    }>(
      `${EXPO_PUBLIC_API_BASE_URL}/games/dates/range`,
      cacheKey,
      { minDate: null, maxDate: null },
      undefined,
      undefined,
      60000,
    );
    return dates;
  } catch (error) {
    console.error("Error fetching date range from API:", error);
    return { minDate: null, maxDate: null };
  }
};
