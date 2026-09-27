# File: `frontend/app/(tabs)/index.tsx`

## Purpose

The **Game of the Day** tab (also called "Programme du jour") displays all games for a selected date, grouped by hour. It allows filtering by league, team, favorites, bookmarks, and supports live score updates.

For a date **strictly before today**, the day is no longer grouped by hour but **by league**: the screen fetches `GET /games/league-day/:gameDate`, which returns one section per league plus a leading **favorites** section (favorite-team games are kept in their league section too). See `getGamesFromApi`, `visibleLeagueGroups` and `visibleSections`.

## Selection stability

The team selector uses the stable callback identifier `teamsOfDay`. `Selector` compares incoming selected IDs by content, preserving draft selection across games/live-score refreshes when the committed selection has not changed.


## Key Features

- **Date navigation** via `SliderDatePicker` (horizontal date slider)
- **Calendar picker** — an imperatively-controlled `DateRangePicker` (single-date mode) is rendered alongside the slider; its dropdown is opened by the magnifier icon in `SliderDatePicker` (`onSearch`) and writes the picked date back to `selectDate` via `handleDateChange`
- **Swipe gestures** to navigate between days (PanResponder)
- **League filter** via `FilterSlider` (ALL, specific leagues, BOOKMARKS)
- **Team filter** via `TeamFilter` (search icon + slider)
- **Live score updates** every 30 seconds via `fetchLiveScores`
- **Games grouped by hour** with status sections (In Progress, Scheduled, Final, Ended) — for **today and upcoming** dates
- **Games grouped by league** — for **past** dates, with a **separate favorites section first** (games kept in their league section)
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
| `closestDates`            | `{ previousDate, nextDate }` | Closest days with games (from `closest` route) for the current filters |
| `closestRequestRef`       | `Ref<string>`          | Dedupe key (date + leagues + team + filter) of the last `closest` request |
| `dateAccordionExpanded`   | `boolean`              | Whether the date filter accordion is open (mobile)     |
| `leagueAccordionExpanded` | `boolean`              | Whether the league filter accordion is open (mobile)   |
| `leagueDayGroups`         | `LeagueDayGroup[]`     | League-grouped payload of a **past day** (from `/games/league-day`): one entry per league, plus a leading `FAVORITES` entry when a favorite team plays that day |
| `favoriteTeamsRef`        | `Ref<string[]>`        | Mirror of `favoriteTeams` read at fetch time (the favorite team ids are sent to the backend, which builds the favorites section) |
| `leagueDayFavoritesKeyRef`| `Ref<string>`          | Favorites key used by the last past-day fetch — prevents refetching the same day when the favorites did not change |

## Key Functions

### `formatDateLocal(date)`

Formats a `Date` to `YYYY-MM-DD` string.

### `groupGamesByHour(games)`

Groups games by hour (`"HH:00"` format) based on `startTimeUTC`.

### `gameIdentity(game)` / `dedupeGames(games)` / `refreshLeagueGroups(groups, updatedGames)` (module-level)

Helpers for the league-grouped past-day view:

- `gameIdentity(game)` — stable key of a game (`uniqueId`, else `_id`, else teams + start time).
- `dedupeGames(games)` — drops duplicates; needed because the backend `FAVORITES` section repeats games already present in their league section, while the flat `games` state (bookmarks, team list, live scores) must contain each game once.
- `refreshLeagueGroups(groups, updatedGames)` — applies refreshed live scores (matched by `gameIdentity`) into the existing league groups without rebuilding them: the grouping and its order always come from the backend.

### `getNextGamesFromApi(date)`

Fetches games for the next 5 days (used for prefetching/caching).

### `pruneOldGamesCache(cache)`

Removes cached games older than yesterday.

### `fetchAndMergeLiveScores(currentGames)`

Fetches live scores for games that started within the last 15 minutes and are not final. Chunks requests by 6 game IDs.

### `getGamesFromApi(dateToFetch)`

Fetches games for a specific date:

- **Past date** (`YYYYMMDD < today`): drops any cached flat games for that day and calls `fetchGamesByLeagueDay(YYYYMMDD, 1000, undefined, favoriteTeams)` → sets `leagueDayGroups` from the returned sections and `games` from `dedupeGames(groups.flatMap(g => g.games))`. On failure both are reset to empty.
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

### Empty day → `closest` date navigation

When `visibleGroupCount` is 0 (no section to display for the day + current filter) and loading is finished, the screen calls `fetchClosestDates` with the displayed date as boundary (`date: YYYY-MM-DD`):

- specific team selected → `teamSelectedIds` = **already resolved uniqueId** stored in `selectedTeamUniqueId` (slider: label → resolved through the `teams` cache at selection time; modal: uniqueId passed directly) — works even when the day is empty (`games` empty);
- otherwise (team filter set to "ALL") → `leagues` = the filtered league (e.g. MLB).

**Fallback inside the effect**: when `selectedTeamUniqueId` is empty but `teamSelectedId` is a label (contains a space), it resolves through `fetchTeams()` (24h cache) before the call. Covers the case where the `teams` cache was not loaded yet at click time.

If the response contains a `previousDate` and/or `nextDate`, navigation buttons are rendered **inside** `NoResults` above the text (props `previousAvailableDate` / `nextAvailableDate` / `onGoToDate`). Tapping a button calls `goToClosestDate`, which navigates via `handleDateChange` to that day.

### `selectedTeamUniqueId`

Dedicated state holding the resolved uniqueId of the selected team:
- **Slider** (`handleTeamFilterChange`): the slider sends a label → resolved via `getCache<Team[]>('teams')` (24h cache, day-independent) → stores the uniqueId;
- **Modal** (`handleTeamSelectionChange`): receives the uniqueId directly → stores it as-is.

Lets the `closest` effect filter by team even when the displayed day is empty (where `games` and `teamsOfTheDay` are empty → no way to resolve from those sources).

### Cache `teams` preload

On mount, `fetchTeams()` is called to guarantee the `teams` cache (24h) is available before any user interaction, so that the label → uniqueId resolution inside `handleTeamFilterChange` always succeeds.

## Key Memoized Values

### `isPastDay`

`true` when the selected date (local `YYYY-MM-DD`) is strictly before today. Selects the grouping mode: league sections for a past day, hour sections otherwise.

### `visibleGamesByHour`

Filters and groups games **for today / upcoming dates**:

1. Filters by `isActive`, `selectLeagues`, `teamSelectedId`, `activeFilter`
2. Sorts by `startTimeUTC`
3. Categorizes games: `inProgress`, `scheduled`, `final`, `finished`
4. Groups scheduled games by hour
5. Sorts favorite team games first

### `visibleLeagueGroups`

Filters the **past-day** sections returned by the backend (`leagueDayGroups`) with the client-side filters only (`isActive`, `selectLeagues`, `teamSelectedId`, favorites/bookmarks `activeFilter`), then drops empty sections. The grouping, the section order and the favorites extraction are untouched — they come from the API.

When `activeFilter === 'FAVORITES'`, only the `FAVORITES` section is kept (every section is still filtered by the selected leagues).

### `visibleSections`

Normalizes the sections actually rendered as `{ key, label, games }`:

- **past day** → `visibleLeagueGroups`, where the `FAVORITES` key is labelled with `translateWord('favorites')` and every other key is the league code used as-is;
- **otherwise** → `visibleGamesByHour`, keyed/labelled by the hour label.

### `visibleGroupCount`

`visibleSections.length`. Used by the retry effect, the `closest` effect and `displayContent` instead of `visibleGamesByHour.length`, so an empty day is detected identically in both grouping modes.

### `teamsOfTheDay`

Builds a unique list of teams from today's games, keyed by `uniqueId`.

### `isAnyGameSelectedToday`

`true` when at least one bookmarked game (`gamesSelected`) is scheduled for the **selected date**
(compared through `gameDate`, falling back to the local date of `startTimeUTC`). It drives both the
bookmark chip icon (`bookmark` when filled, `bookmark-o` when outlined) and its enabled state.

### `disabledFilters`

Leagues with no active games today + `BOOKMARKS` while no bookmarked game is scheduled for the
selected date (`!isAnyGameSelectedToday`). The bookmark chip is then dimmed and **not clickable**
(`FilterSlider` `disabledValues`), so an empty bookmarks list can never be opened — the same
condition as the outlined bookmark icon. Note it no longer keys off `gamesSelected.length === 0`
only: bookmarks from other dates are invisible for the displayed day.

## Data Flow

1. On mount (after `firestoreReady`), restores cached games and fetches from API
2. `getGamesFromApi()` fetches games for the selected date — hours payload for today/upcoming, `/games/league-day` sections for a past date
3. `visibleSections` holds the rendered sections: `visibleLeagueGroups` for a past day, `visibleGamesByHour` otherwise
4. Live scores update every 30 seconds while the tab is focused (past days: refreshed inside `leagueDayGroups` via `refreshLeagueGroups`)
5. UI renders one accordion per section

## Favorites Section Refetch

The favorites section of a past day is computed by the **backend**, so the favorite team ids are sent with `/games/league-day`. A dedicated effect (declared after the init effect) refetches the selected past day when `favoriteTeams` differs from `leagueDayFavoritesKeyRef` — the key used by the last past-day fetch — so opening/closing the day or listing leagues never triggers an extra request. Leagues, team and bookmarks filters stay client-side (`visibleLeagueGroups`) and need no refetch.

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

## Date / Calendar Datepicker Behavior

When the user opens the **calendar datepicker** (via the magnifier/loupe in `SliderDatePicker`), the calendar renders in a **centered modal** (outside the page layout), so the league/team accordion is **left in its current state** (open or closed):

```ts
const openCalendarDatepicker = useCallback(() => {
  dateRangePickerRef.current?.open();   // open the calendar datepicker
}, []);
```

`openCalendarDatepicker` is wired to `SliderDatePicker` `onSearch` (the loupe button that displays the calendar). The date accordion's `onExpandedChange` (`handleDateAccordionExpanded`) only updates `dateAccordionExpanded` and does **not** collapse anything.
