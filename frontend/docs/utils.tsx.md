# File: `frontend/utils/utils.tsx`

## Purpose

The **utils** file provides shared utility functions for random selection, favorite team management, ICS file generation, and multilingual translation.

## Key Functions

### `randomNumber(max)`

Returns a random integer between 0 and `max` (inclusive).

### `getRandomTeamId(teams)`

Returns a random team's `uniqueId` from the teams array.

### `addNewTeamId(selection, teams)`

Adds a random team ID to the selection if it's not already present.

### `removeLastTeamId(selection)`

Removes the last team ID from the selection.

### `addFavoriteTeam(favoriteTeams, teamId)`

Adds or removes a team from favorites:

1. If team is already a favorite and there's more than 1 favorite: removes it
2. If team is not a favorite and under `maxFavoritesNumber`: adds it
3. Saves to cache via `saveCache('favoriteTeams', ...)`
4. Syncs to Firestore if user is logged in
5. Dispatches `favoritesUpdated` event

### `generateICSFile({ homeTeam, awayTeam, startTimeUTC, arenaName, placeName })`

Generates and downloads an `.ics` calendar file for a game:

1. Validates `startTimeUTC`
2. Creates ICS content with `BEGIN:VCALENDAR`, `VEVENT`, etc.
3. Creates a Blob and triggers a download
4. Sanitizes the filename

### `translateFilterLabel(context)`

Returns a localized label for filter sections (`league`, `team`, `date`, `league_team`). Supports: English, French, German, Spanish, Italian, Japanese, Korean, Dutch, Portuguese, Russian, Chinese.

### `translateWord(word)`

Returns a localized translation for a word/key. Supports the same languages as `translateFilterLabel`. Used for UI text like `all`, `gamesOfDay`, `filterTeams`, `inProgress`, etc.

### `getFilterAccordionLabel({ prefix, fallbackLabel, activeFilter, selectedTeam, expanded })`

Builds an accordion label for filter sections, only showing the dynamic selection when the accordion is **closed** (collapsed). Reusable across screens (e.g. index, schedule).

Returns `{ prefix, value }` so callers can render the value with the same styling as the date filter (e.g. `<i><b>value</b></i>`).

- `prefix` — translated prefix, e.g. `"Filtrer par ligue / équipe"`
- `fallbackLabel` — label shown when no specific filter is active
- `activeFilter` — selected league value (e.g. `"NFL"`). Ignored when `ALL`/`FAVORITES`/`BOOKMARKS`
- `selectedTeam` — `{ league, abbrev }` of the selected team
- `expanded` — when `true`, the fallback label is shown

Examples:

- no filter: `{ prefix: "Filter by league / team", value: "" }`
- league selected: `{ prefix: "Filter by league / team", value: "NFL" }`
- team selected: `{ prefix: "Filter by league / team", value: "MLB / CHC" }`
- expanded: `{ prefix: "Filter by league / team", value: "" }`
