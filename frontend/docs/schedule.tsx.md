# File: `frontend/app/(tabs)/schedule.tsx`

## Purpose

The **Schedule** tab (also called "Focus Team" / "Suivre une équipe") displays the remaining games of a selected team, grouped by month. It allows filtering by league, team, opponent (VS), and month.

## Key Features

- **League selection** via `FilterSlider` (horizontal chips)
- **Team selection** via `TeamFilter` (search icon + slider)
- **Opponent (VS) filter** — filters games by a specific opponent team
- **Month filter** — groups games by month and allows filtering to a single month
- **Previous scores toggle** — shows/hides past results
- **Sticky filter header** on small devices
- **Auto-scroll** to the first upcoming game

## State Variables

| Variable               | Type          | Description                                 |
| ---------------------- | ------------- | ------------------------------------------- |
| `games`                | `FilterGames` | Remaining games keyed by date               |
| `results`              | `FilterGames` | Past results keyed by date                  |
| `teams`                | `Team[]`      | All teams from API                          |
| `teamSelected`         | `string`      | Currently selected team ID                  |
| `gamesTeamId`          | `string`      | Team ID used for the games data             |
| `teamFilter`           | `string`      | Opponent filter (VS) value                  |
| `monthFilter`          | `string[]`    | Selected month(s), format: `"January 2026"` |
| `leagueTeams`          | `Team[]`      | Teams available in the selected league      |
| `leaguesAvailable`     | `string[]`    | Available leagues                           |
| `leagueOfSelectedTeam` | `string`      | League of the selected team                 |
| `showPreviousScores`   | `boolean`     | Whether to show past results                |
| `isTeamAccordionOpen`  | `boolean`     | Mobile accordion state for team filter      |
| `isDateAccordionOpen`  | `boolean`     | Mobile accordion state for date filter      |

## Key Functions

### `mergeGames(initial, remaining)`

Merges two `FilterGames` objects by date, deduplicating by `uniqueId` and sorting by `startTimeUTC`.

### `getSelectedTeams(allTeams, forcedLeague?, forcedTeam?)`

Restores the team selection from URL params, localStorage, or favorites. Falls back to a random team.

### `storeTeamSelected(teamSelection, teamsList?)`

Persists the selected team to localStorage and updates `teamSelected`, `leagueOfSelectedTeam`, and `leagueTeams`.

### `handleTeamSelectionChange(teamSelectedId)`

Called when the user changes the main team. Resets `teamFilter` and `monthFilter`, updates URL params, persists to localStorage and Firestore.

### `handleTeamFilterChange(teamSelectedId)`

Called when the user changes the opponent (VS) filter. Only updates `teamFilter`.

### `handleLeagueSelectionChange(leagueSelectedId)`

Called when the user changes the league. Resets filters, updates URL params, selects a team in the new league (from stored selection, favorites, or random).

### `getGamesFromApi()`

Fetches games from the API:

- If `teamSelected === 'all'`: fetches all games for the league
- Otherwise: fetches remaining games for the specific team
- If `showPreviousScores`: also fetches results
- Caches data in localStorage via `saveCache('scheduleData', ...)`

## Key Memoized Values

### `visibleGamesByMonth`

Groups games by month (`"January 2026"` format). Applies:

1. `teamFilter` (opponent filter) — filters games where home or away team matches
2. `gamesTeamId` — filters to games involving the selected team
3. Returns `[{ month, games }]` array, filtered to months with games

### `uniqueTeamsFromGames`

Builds a list of unique opponent teams from games, **respecting the `monthFilter`**:

- If `teamSelected === 'all'` and no month filter: returns all teams in the league
- Otherwise: iterates games, filters by selected month (using `monthKey = "${month} ${year}"`), and collects unique home/away teams (excluding the selected team)

### `showTeamFilter`

```typescript
const showTeamFilter = uniqueTeamsFromGames.length > 0;
```

Controls whether the opponent (VS) filter is displayed. Shows whenever there's at least 1 opponent.

## Recent Fix: Month Filter Opponent Recalculation

### Problem

When filtering by month, the opponent (VS) filter was not recalculated. The `monthFilter` state contains values like `"January 2026"` (month + year), but the comparison in `uniqueTeamsFromGames` only extracted the month name (`"January"`) without the year. This caused `monthFilter.includes(month)` to always return `false`, so every day was skipped via `continue`, resulting in an empty opponent list.

### Fix

Updated the month comparison to build the full month key matching the `monthFilter` format:

```typescript
if (monthFilter.length > 0) {
  const year = new Date(day).getFullYear();
  const month = new Date(day).toLocaleString('default', { month: 'long' });
  const monthKey = `${month} ${year}`;
  if (!monthFilter.includes(monthKey)) continue;
}
```

Also changed `showTeamFilter` from `> 1` to `> 0` so the filter shows even with a single opponent.

## Data Flow

1. On mount (after `firestoreReady`), teams are fetched and selection is restored
2. `getGamesFromApi()` fetches games for the selected team
3. `visibleGamesByMonth` groups games by month
4. `uniqueTeamsFromGames` builds the opponent list (respecting month filter)
5. UI renders filters + accordions per month
