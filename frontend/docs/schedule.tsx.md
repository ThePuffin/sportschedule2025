# File: `frontend/app/(tabs)/schedule.tsx`

## Purpose

The **Schedule** tab (also called "Focus Team" / "Follow a team") displays the remaining games of a selected team, grouped by month. It allows filtering by league, team, opponent (VS), and month.

## Selection stability

Team selectors use stable callback identifiers (`teams` and `teamsFilter`). `Selector` compares incoming selected IDs by content, so a parent render after fetching teams or games does not reset an unvalidated selection when the committed selection is unchanged.


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
| `selectableTeams`      | `Team[]`      | Teams pickable as main filter (`GET /teams?minGames=…`) |
| `teamSelected`         | `string`      | Currently selected team ID                  |
| `gamesTeamIds`         | `string[]`    | Team IDs used for the games data (both sport ids for an Olympic country) |
| `teamFilter`           | `string`      | Opponent filter (VS) value                  |
| `monthFilter`          | `string[]`    | Selected month(s), format: `"January 2026"` |
| `leagueTeams`          | `Team[]`      | Teams available in the selected league      |
| `leaguesAvailable`     | `string[]`    | Available leagues                           |
| `leagueOfSelectedTeam` | `string`      | League of the selected team                 |
| `showPreviousScores`   | `boolean`     | Whether to show past results                |
| `hasPreviousHistory`   | `boolean`     | Whether the `closest` route reported a `previousDate` for the current selection |
| `closestRequestRef`    | `Ref<string>` | Dedupe key (`team:<id>` or `league:<code>`) of the last `closest` request |
| `fetchSequenceRef`     | `Ref<number>` | Monotonically increasing sequence; every (re)start of `getGamesFromApi`   |
|                        |               | bumps it so stale responses from a superseded team selection are ignored  |
|                        |               | before every `setState`                                                   |
| `abortControllerRef`   | `Ref<AbortController>` | Holds the `AbortController` of the current request; aborted when the   |
|                        |               | selection changes or the effect unmounts, so in-flight HTTP calls are     |
|                        |               | cancelled instead of piling up                                            |
| `debounceTimerRef`     | `Ref<Timeout>` | Debounce timer (300 ms) on team/league selection changes: only the last   |
|                        |               | selection within the window fires the API chain                           |
| `isTeamAccordionOpen`  | `boolean`     | Accordion state for team filter. Defaults to `true` (open on every screen size) |
| `isDateAccordionOpen`  | `boolean`     | Accordion state for date filter. Defaults to `width >= ACCORDION_MAX_WIDTH` — closed on medium screens and open on large screens |
| `teamAccordionLabel`   | `string`      | Dynamic label for team/league accordion     |
| `dateAccordionLabel`   | `string`      | Dynamic label for date/month accordion      |

## Key Functions

### `mergeGames(initial, remaining)`

Merges two `FilterGames` objects by date, deduplicating by `uniqueId` and sorting by `startTimeUTC`.

### `getSelectedTeams(allTeams, forcedLeague?, forcedTeam?)`

Restores the team selection from URL params, localStorage, or favorites. Falls back to a random team.

When URL params point to an **unknown league**, a random available league is selected and the team falls back to `'all'`. When the league is known but the team id does not belong to it, the team falls back to `'all'` for that league. In both cases the screen shows the league's games instead of a blank screen.

### `storeTeamSelected(teamSelection, teamsList?)`

Persists the selected team to localStorage and updates `teamSelected`, `leagueOfSelectedTeam`, and `leagueTeams`.

### `handleTeamSelectionChange(teamSelectedId)`

Called when the user changes the main team. Resets `teamFilter` and `monthFilter`, updates URL params, persists to localStorage and Firestore.

### `handleTeamFilterChange(teamSelectedId)`

Called when the user changes the opponent (VS) filter. Only updates `teamFilter`.

### `handleLeagueSelectionChange(leagueSelectedId)`

Called when the user changes the league. Resets filters, updates URL params, selects a team in the new league (from stored selection, favorites, or random).

### `getGamesFromApi()`

Fetches games from the API with a stale-while-revalidate strategy for results:

- If `teamSelected === 'all'`: fetches all games for the league
- Otherwise: fetches remaining games for the selected team; Olympic country ids cover both hockey and basketball for the same gender
- **Results are shown from cache immediately** (`scheduleResults_<team|league>` in localStorage) so the UI is never blocked waiting for live-score updates
- **Results are refreshed in the background** (`fetchResultsByTeam` / `fetchResultsByLeague` fired non-blocking); when complete, the cache and UI are updated with the freshest scores
- Caches games data in localStorage via `saveCache('scheduleData', ...)`

The Olympic team selector groups hockey and basketball roster entries by country and gender into a single option labelled with the country name only. The opponent selector uses the same country/gender identity so choosing a country applies to either sport.

### Empty schedule → `closest` history button

When `visibleGamesByMonth` is empty (no upcoming games) and history is not already
enabled (`showPreviousScores === false`), the screen calls `fetchClosestDates`:

- If `teamSelected === 'all'`: sends `{ league: leagueOfSelectedTeam }`
- Otherwise: sends `{ teamSelectedId: teamSelected }`; the backend expands Olympic ids to both hockey and basketball team ids

If the response contains a `previousDate`, an "Enable history" button
(`translateWord('enableHistory')`, `MaterialIcons` `history` icon) is rendered
**inside** the `NoResults` component, above the "No results" text
(via props `showHistoryButton` + `onEnableHistory`). Clicking it calls `handlePreviousScoreToggle(true)`
to enable the history. Hidden while loading or once history is enabled.

## Key Memoized Values

### `visibleGamesByMonth`

Groups games by month (`"January 2026"` format). Applies:

1. `teamFilter` (opponent filter) — filters games where home or away team matches
2. `gamesTeamIds` — filters to games involving any sport-specific id for the selected team (keeps ALL games
   of the day for that team via `filter`, so doubleheaders with 2 games the same
   day both display)
3. Returns `[{ month, games }]` array, filtered to months with games

### `uniqueTeamsFromGames`

Builds a list of unique opponent teams from games, **respecting the `monthFilter`**:

- If `teamSelected === 'all'` and no month filter: returns all teams in the league
- Otherwise: iterates games, filters by selected month (using `monthKey = "${month} ${year}"`), and collects unique home/away teams (excluding the selected team). Olympic hockey/basketball opponents from the same country and gender are shown once.

### `teamsForSelector` / `selectableTeamsForSelector`

- `teamsForSelector` is the **full** roster of the selected league (`leagueTeams`). It is
  deliberately not restricted: it also resolves the metadata (label, league, logo) of the
  **opponents** listed by `uniqueTeamsFromGames`, and an opponent must be shown whoever it is,
  however few games it has.
- `selectableTeamsForSelector` = `restrictToSelectableTeams(teamsForSelector, selectableTeams,
  [teamSelected, 'all'])` — the narrowed list used by the two **selection** surfaces only: the team
  chips (`dataTeams`) and the search selector (`filterData` of `TeamFilter`). A team must have more
  than `selectableMinGames` official (non-preseason) games to be newly picked. The current
  `teamSelected` and the `'all'` pseudo-team are always kept, so an out-of-threshold selection
  stays visible; if the selectable list hasn't loaded (or the fetch failed) the roster is used
  untouched.

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

### Request storm protection (team/league selection changes)

When the user switches teams rapidly, each change used to relaunch a chain of 2–3 sequential API calls
without cancelling previous in-flight requests. `schedule.tsx` now:

1. **Debounces** the selection change by 300 ms (`debounceTimerRef`): only the last selection within the
   window actually fires the API chain.
2. **Aborts** the previous request via `AbortController` (`abortControllerRef`) before starting a new one,
   so HTTP calls are cancelled server-side instead of stacking up.
3. **Guards against stale responses** with `fetchSequenceRef`: every `getGamesFromApi` call bumps a
   sequence number, and every `setGames`/`setResults`/`setIsLoading` returns early if the response belongs
   to a superseded selection (`fetchSequenceRef.current !== seq`).

The effect cleanup aborts the controller and clears the debounce timer on unmount or re-run.

`getGamesFromApi(seq?, signal?)` forwards the signal to every helper it calls
(`smallFetchRemainingGamesByLeague`, `fetchRemainingGamesByLeague`,
`fetchResultsByLeague`, `fetchResultsByTeam`, `fetchRemainingGamesByTeam`), so the
whole chain is cancelled, not only its first call.

## Data Flow

1. On mount (after `firestoreReady`), teams are fetched and selection is restored
2. `getGamesFromApi()` fetches games for the selected team:
   - Cached results (`scheduleResults_<team|league>`) are displayed immediately if `showPreviousScores`
   - Games are fetched from the API (loading indicator shown)
   - Results are refreshed in the background; fresh scores replace the cache once the fetch settles
3. `visibleGamesByMonth` groups games by month
4. `uniqueTeamsFromGames` builds the opponent list (respecting month filter)
5. UI renders filters + accordions per month

## Accordion Label Behavior

The team/league and date/month accordions use `getFilterAccordionLabel` to show dynamic labels **only when the accordion is closed**:

- **Team/League accordion** (`teamAccordionLabel`): contains both league and team filters on every screen size. It shows `"Filter by league / team : <LEAGUE>/<team short name>"` when a team is selected, or `"Filter by league / team : <league>"` when a league is selected.
- **Date/Month accordion** (`dateAccordionLabel`): shows `"Filter by date : <month>"` when a month is selected.

When the accordion is open, the default translated label is shown. The `onExpandedChange` callbacks update `isTeamAccordionOpen` and `isDateAccordionOpen`.

The team/league accordion contains both filters and is **open everywhere** (`defaultOpen={true}`, `isTeamAccordionOpen` initialised to `true`). The date/month accordion is **closed on medium screens** and **open on large screens** (`defaultOpen={width >= ACCORDION_MAX_WIDTH}`, `isDateAccordionOpen` initialised to `width >= ACCORDION_MAX_WIDTH`). On large screens both accordions therefore start open.
