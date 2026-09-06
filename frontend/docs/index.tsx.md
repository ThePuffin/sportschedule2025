# File: `frontend/app/(tabs)/index.tsx`

## Purpose

The **Game of the Day** tab (also called "Programme du jour") displays all games for a selected date, grouped by hour. It allows filtering by league, team, favorites, bookmarks, and supports live score updates.

## Key Features

- **Date navigation** via `SliderDatePicker` (horizontal date slider)
- **Calendar picker** — an imperatively-controlled `DateRangePicker` (single-date mode) is rendered alongside the slider; its dropdown is opened by the magnifier icon in `SliderDatePicker` (`onSearch`) and writes the picked date back to `selectDate` via `handleDateChange`
- **Swipe gestures** to navigate between days (PanResponder)
- **League filter** via `FilterSlider` (ALL, specific leagues, BOOKMARKS)
- **Team filter** via `TeamFilter` (search icon + slider)
- **Live score updates** every 30 seconds via `fetchLiveScores`
- **Games grouped by hour** with status sections (In Progress, Scheduled, Final, Ended)
- **Favorite teams sorting** — favorite team games appear first
- **Bookmark selection** — select up to 10 games
- **Retry mechanism** — auto-retries fetching when no games are found
- **Cache management** — caches games by day, prunes old days

## State Variables

| Variable                  | Type                   | Description                                            |
| ------------------------- | ---------------------- | ------------------------------------------------------ |
| `games`                   | `GameFormatted[]`      | Games for the selected date                            |
| `selectDate`              | `Date`                 | Currently selected date                                |
| `selectLeagues`           | `League[]`             | Leagues to display                                     |
| `userLeagues`             | `League[]`             | User's selected leagues                                |
| `favoriteTeams`           | `string[]`             | Favorite team IDs                                      |
| `activeFilter`            | `string`               | Active filter: `ALL`, league, `FAVORITES`, `BOOKMARKS` |
| `showScores`              | `boolean`              | Whether to show scores                                 |
| `gamesSelected`           | `GameFormatted[]`      | Bookmarked games (max 10)                              |
| `teamSelectedId`          | `string`               | Selected team filter                                   |
| `dateLimits`              | `{ minDate, maxDate }` | Min/max selectable dates                               |
| `isLoading`               | `boolean`              | Loading state                                          |
| `retryCount`              | `number`               | Auto-retry counter                                     |
| `dateAccordionExpanded`   | `boolean`              | Whether the date filter accordion is open (mobile)     |
| `leagueAccordionExpanded` | `boolean`              | Whether the league filter accordion is open (mobile)   |

## Key Functions

### `formatDateLocal(date)`

Formats a `Date` to `YYYY-MM-DD` string.

### `groupGamesByHour(games)`

Groups games by hour (`"HH:00"` format) based on `startTimeUTC`.

### `getNextGamesFromApi(date)`

Fetches games for the next 5 days (used for prefetching/caching).

### `pruneOldGamesCache(cache)`

Removes cached games older than yesterday.

### `fetchAndMergeLiveScores(currentGames)`

Fetches live scores for games that started within the last 15 minutes and are not final. Chunks requests by 6 game IDs.

### `getGamesFromApi(dateToFetch)`

Fetches games for a specific date:

- Checks cache first (`gamesDayCache`)
- For today: merges recent yesterday games (within 3 hours, no score)
- Fetches from API if not cached
- Updates live scores immediately for today's games
- Prefetches next 5 days for today

### `handleDateChange(startDate, endDate)`

Called when the user changes the date. Updates URL params, scrolls to top, fetches games.

### `handleFilterChange(filter)`

Called when the user changes the league/filter:

- `ALL`: resets to all user leagues
- `FAVORITES` / `BOOKMARKS`: shows all leagues
- Specific league: filters to that league

### `handleTeamSelectionChange(teamId)`

Called when the user changes the team filter.

## Key Memoized Values

### `visibleGamesByHour`

Filters and groups games:

1. Filters by `isActive`, `selectLeagues`, `teamSelectedId`, `activeFilter`
2. Sorts by `startTimeUTC`
3. Categorizes games: `inProgress`, `scheduled`, `final`, `finished`
4. Groups scheduled games by hour
5. Sorts favorite team games first

### `teamsOfTheDay`

Builds a unique list of teams from today's games, keyed by `uniqueId`.

### `disabledFilters`

Leagues with no active games today + `BOOKMARKS` if no games selected.

## Data Flow

1. On mount (after `firestoreReady`), restores cached games and fetches from API
2. `getGamesFromApi()` fetches games for the selected date
3. `visibleGamesByHour` filters and groups games
4. Live scores update every 30 seconds while the tab is focused
5. UI renders accordions per hour group

## Date Accordion Label Behavior

The date filter accordion's label (the `<span>` containing the formatted date) is only shown when:

- The device is **mobile** (`isSmallDevice` is `true`), **and**
- The accordion is **closed** (`dateAccordionExpanded` is `false`)

When the accordion is open, or on desktop (no accordion), only the plain translated "Date" label is displayed. The `onExpandedChange` callback updates `dateAccordionExpanded` whenever the accordion toggles.

## League Accordion Label Behavior

The league filter accordion's label (`leagueAccordionLabel`) dynamically reflects the current filter state, but **only when the accordion is closed** (`leagueAccordionExpanded` is `false`):

- If a **team** is selected (`teamSelectedId` is set), the label shows `"Filter by league / team : <LEAGUE>/<team short name>"` (e.g. `MLB/CHC` for the Chicago Cubs).
- If a **specific league** is selected (`activeFilter` is not `ALL`, `FAVORITES`, or `BOOKMARKS`), the label shows `"Filter by league / team : <league name>"`.
- Otherwise, the default translated label ("League / Team" on mobile, "League" on desktop) is shown.

When the accordion is open, the default translated label is always shown. The `onExpandedChange` callback updates `leagueAccordionExpanded` whenever the accordion toggles.
