# File: `frontend/utils/fetchData.ts`

## Purpose

The **fetchData** utility provides all API fetching functions with caching, compression, and retry logic. It handles teams, games, leagues, live scores, and date ranges.

## Key Features

- **Compressed caching** — data is compressed with `fflate` before storing in localStorage/sessionStorage
- **Cache validation** — checks timestamps to determine if cache is still valid
- **Fetch timeout** — aborts requests after a configurable timeout
- **Retry logic** — retries after 10s if cache is invalid
- **Team games cache** — short-TTL cache (6 minutes) for team schedules
- **Session storage** — used for hourly game data (short-lived)

## Cache Helpers

### `saveCache(cacheKey, data, storage?)`

Compresses data with `fflate.compressSync` and stores it with a timestamp:

```typescript
storage.setItem(cacheKey, storableString);
storage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
```

### `getCache(cacheKey, storage?)`

Reads and decompresses cached data. Returns `null` if missing or corrupted (clears corrupted cache).

### `isCacheValid(cacheKey, maxDuration, storage?)`

Checks if cache is still valid based on timestamp and max duration in hours.

### `fetchWithTimeout(url, timeoutMs, options?)`

Wraps `fetch` with an `AbortController` timeout.

### `fetchWithCacheStrategy(url, cacheKey, emptyValue, customGetCache?, customSaveCache?, retryTimeout?, storage?)`

Core fetch strategy:

1. Try fetching from API (5s timeout)
2. On success: save to cache, return data
3. On failure: check cache (custom or standard)
4. If cache valid: return cached data
5. If cache invalid: wait 10s, retry with `retryTimeout`
6. If retry fails: return `emptyValue`

## API Functions

### `fetchGamesByHour(date, limit?, skip?)`

Fetches games for a specific date, grouped by hour. Uses sessionStorage with 2-minute TTL. Includes `leagues` param from `leaguesSelected` cache.

### `fetchLeagues(setLeaguesAvailable)`

Fetches available leagues. Cached for 24 hours.

### `fetchTeams()`

Fetches all teams. Cached for 24 hours.

### `fetchRemainingGamesByTeam(teamSelected, startDate?)`

Fetches remaining games for a team. Uses the team games cache (6-minute TTL). If `startDate` is provided, skips cache.

### `fetchResultsByTeam(teamSelected, startDate?)`

Fetches past results for a team.

### `fetchResultsByLeague(league, startDate?, maxResults?)`

Fetches past results for a league.

### `fetchRemainingGamesByLeague(league, limit?, skip?, startDate?, isHome?)`

Fetches remaining games for a league with optional pagination and home-only filter.

### `smallFetchRemainingGamesByLeague(league)`

Fetches a small batch (50 games, home only) for a league — used for quick initial load.

### `refreshGamesLeague(league)`

Triggers a backend refresh for a league's games (POST).

### `refreshTeams(endpoint)`

Triggers a backend refresh for teams (POST).

### `fetchGames(date)`

Fetches games for a specific date (no cache).

### `fetchLiveScores(gameIds)`

Fetches live scores for a batch of game IDs (POST, 15s timeout).

### `fetchDateRangeFromApi()`

Fetches min/max date limits. Cached for 24 hours.

## Team Games Cache

```typescript
const TEAM_GAMES_CACHE_TTL_HOURS = 0.1; // 6 minutes
```

- Stored under key `games_team_map`
- Pruned on load and save (entries older than TTL are removed)
- Used by `fetchRemainingGamesByTeam` to avoid repeated API calls
