# File: `frontend/app/(tabs)/calendar.tsx`

## Purpose

The **Calendar** tab (also called "Agenda") displays games for multiple selected teams over a date range. It allows selecting up to 9 teams, reordering them, hiding/showing teams, and bookmarking games.

## Key Features

- **Multi-team selection** — select up to 9 teams via `TeamReorderSelector`
- **Team reorder modal** — reorder teams via drag-and-drop
- **Date range picker** — select a start and end date via `DateRangePicker`
- **Home/Away game toggle** — filter to home games, away games, or all
- **Swipe gesture** — swipe left/right on the page to cycle through home / all / away filters
- **Hidden teams** — hide specific teams from the display
- **Bookmarked games modal** — view and manage selected games
- **Firestore sync** — teams, games, and date range synced to user account

## State Variables

| Variable              | Type                     | Description                       |
| --------------------- | ------------------------ | --------------------------------- |
| `games`               | `FilterGames`            | Games keyed by date               |
| `teams`               | `Team[]`                 | All teams from API                |
| `teamsSelected`       | `string[]`               | Selected team IDs (max 9)         |
| `gamesSelected`       | `GameFormatted[]`        | Bookmarked games                  |
| `homeGameVisibility`  | `HomeGameFilter`         | `'all'`, `'home'`, or `'away'`    |
| `allowedLeagues`      | `string[]`               | Leagues the user has selected     |
| `hiddenTeams`         | `string[]`               | Team IDs hidden from display      |
| `dateRange`           | `{ startDate, endDate }` | Selected date range               |
| `reorderModalVisible` | `boolean`                | Team reorder modal visibility     |
| `gamesModalVisible`   | `boolean`                | Bookmarked games modal visibility |
| `isTeamAccordionOpen` | `boolean`                | Team filter accordion state       |
| `isDateAccordionOpen` | `boolean`                | Date range accordion state        |

## Key Functions

### `storeTeamsSelected(teamsSelectedIds, teamsList?, syncToDB?)`

Persists selected teams to cache and Firestore. Prunes bookmarked games that no longer involve selected teams.

### `getSelectedTeams(allTeams, shouldSyncDB?)`

Restores team selection from cache, favorites, or opens the reorder modal if empty.

### `getStoredGames()`

Reads cached games and filters to dates >= today.

### `getStoredTeams()`

Restores teams and games from cache on load.

### `getTeamsFromApi()`

Fetches all teams from the API and caches them.

### `getGamesFromApi(startDate?, endDate?)`

Fetches games for the selected teams within the date range from the API:

```
GET /games/filter?startDate=...&endDate=...&teamSelectedIds=id1,id2,...
```

### `handleDateChange(startDate, endDate)`

Called when the user changes the date range. Fetches games, prunes bookmarked games outside the range, syncs to Firestore.

### `handleGamesSelection(game)`

Toggles a game in the bookmarked selection (max 10). Matches games by teams + exact UTC date/time.

### `handleOpenReorder()`

Opens the team reorder modal with the current valid team selection.

### `handleSaveReorder()`

Saves the reordered team selection.

### `handleClearGamesSelection()`

Clears all bookmarked games.

### `swipePanResponder`

A `PanResponder` created with `useMemo` that detects horizontal swipes on the page. It cycles through the `['home', 'all', 'away']` filter order:

- **Swipe left** (`dx < -30`) → next filter
- **Swipe right** (`dx > 30`) → previous filter

Only horizontal swipes are captured (ignores vertical scroll) via `onMoveShouldSetPanResponder`.

## Key Memoized Values

### `filteredTeamsSelected`

Teams selected that are in the user's allowed leagues.

### `filteredGamesSelected`

Bookmarked games that are active and in allowed leagues.

### `teamsAvailableForReorder`

All teams filtered by allowed leagues.

## Data Flow

1. On mount (after `firestoreReady`), restores date range and teams from cache
2. Fetches all teams from API
3. Fetches games for selected teams within the date range
4. Displays accordions per date, filtered by hidden teams and home/away visibility
5. Team changes, date changes, and game selections sync to Firestore

## Accordion Label Behavior

Like `index.tsx` and `schedule.tsx`, the Calendar accordions show dynamic filter labels **only when the accordion is closed**:

- **Team accordion** (`teamAccordionLabel`): lists the selected teams by their **short name** (`abbrev`) joined by commas (e.g. `NJD, CHC, DEN, SEA`). Hidden teams are excluded.
- **Date accordion** (`dateAccordionLabel`): shows the selected period as `start - end` (e.g. `Aug 22, 2026 - Sep 5, 2026`).

When the text is too long for the screen width, it is truncated with ellipses (`...`) using CSS `text-overflow: ellipsis`.
