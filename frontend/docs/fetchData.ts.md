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

### `fetchGamesByLeagueDay(date, limit?, skip?, favoriteTeams?)`

Fetches games for a specific date, **grouped by league** (`GET /games/league-day/:gameDate`), used by the day view for **past dates**. Returns `LeagueDayGroup[]` (the `groups` array of the response) where the first entry may be the special `FAVORITES` key (favorite-team games, also kept in their league group) followed by one entry per league in alphabetical order (games oldest-to-newest within each group).

- Query params: `leagues` (from the `leaguesSelected` cache, `+`-joined), `maxResults`, `skip`, `favoriteTeams` (`+`-joined team uniqueIds)
- sessionStorage cache (2-minute TTL) keyed on the date **and** all params, so a favorites change gets its own entry
- Returns `[]` when the request fails and no cache is available (the strategy caches the raw `{ groups }` object, which the helper unwraps)

### `fetchLeagues(setLeaguesAvailable)`

Fetches available leagues. Cached for 24 hours.

### `fetchTeams()`

Fetches all teams. Cached for 24 hours.

### `fetchRemainingGamesByTeam(teamSelected, startDate?)`

Fetches remaining games for a team. Uses the team games cache (6-minute TTL). If `startDate` is provided, skips cache.

### `fetchResultsByTeam(teamSelected, startDate?)`

Fetches past results for a team.

### `fetchRecentFormGames(teamSelected, before?, limit = 5)`

Fetches the last finished games of a team for the modal's form dots, from
`GET /games/team/:teamSelected/form`. Used by `GameModal` instead of `fetchResultsByTeam`, because the
`/results` endpoint filters on `teamSelectedId` — an id only stored on **one** side of a deduplicated
game, so it returned an incomplete history for the opponent.

- `before` is only passed for a game already played (that game's own ISO start); it becomes the strict
  `startTimeUTC < before` bound. It is left `undefined` for an upcoming game, so the backend returns
  the team's most recent played games. Omitting it also keeps the URL — hence the cache key — stable
  across opens, whereas a `now` bound carries milliseconds and would make every request unique.
- An unparsable `before` is treated as no bound.
- **Own cache layer** with a stable key `recent_form_v2_<team>_<limit>_<before|latest>`: a past game's row
  is immutable, so it is kept for **24 h**; an upcoming game's row still gains results, so it is
  re-checked every **5 min**. An empty row is never cached, so a team without history is not stuck
  blank once its first result lands. (`fetchWithCacheStrategy` is called with `cacheKey: null`: it only
  provides the fetch + retry, not this cache.) The `v2` suffix is a cache version: it was bumped when
  the backend started collapsing the double-stored copies of a match, so the 24 h entries written with
  the duplicates are not served anymore — bumping it is the way to invalidate this cache from the
  server side.

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

### `fetchClosestDates({ league?, teamSelectedId?, date? })`

Calls `GET /games/dates/closest` with `leagues` and/or `teamSelectedIds` query params.
Returns `{ previousDate, nextDate }` (nullable). No cache — used when the Schedule
screen has no upcoming games to decide whether to offer the "Enable history" button.

## Team Games Cache

```typescript
const TEAM_GAMES_CACHE_TTL_HOURS = 0.1; // 6 minutes
```

- Stored under key `games_team_map`
- Pruned on load and save (entries older than TTL are removed)
- Used by `fetchRemainingGamesByTeam` to avoid repeated API calls
