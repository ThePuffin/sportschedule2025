# File: `frontend/components/CardLarge.tsx`

## Purpose

The **CardLarge** component displays a single game as a card with team logos, scores, time, arena, and interactive elements (favorites, bookmarks, live badge, modal).

## Key Features

- **Team display** — home/away team logos, names, abbreviations, records
- **Score display** — shows scores with reveal button for hidden scores
- **Live badge** — pulsing red dot for live games
- **Game status** — displays period, clock, final, postponed, etc.
- **Favorite stars** — add/remove favorite teams
- **Bookmark** — select/deselect games (max 10)
- **Arena link** — clickable Google Maps link
- **Game modal** — opens `GameModal` on card press
- **Entry animation** — fade/scale/slide with IntersectionObserver
- **Selection pulse** — subtle scale animation when selected
- **Adaptive colors** — team colors adapt to light/dark theme
- **Home/Away visibility** — hides cards based on `homeGameVisibility`
- **Vertical stacked ordering** — in `verticalMode`, the card stacks as away → `@`/score → home, with the date/time (center column `centerTime`) placed at the very bottom (order 4), keeping the `@` between the two logos. The gap below the bottom logo equals the gap above the footer separator (`marginTop: 20`, `marginBottom: 0`, combined with `mainRow` bottom padding and `footer` top margin).
- **Two-line date/time** — when `showDate + showTime` are both true (Schedule tab) on a
  scheduled game, date and time are computed separately via `Intl` (`dateLine` /
  `timeLine`) and rendered stacked (date above, time below), so two games the
  same day (doubleheaders) are distinguishable by hour. Locale-independent: no
  string splitting on commas.
- **Favorites details mode** — when `onRemoveFromFavorites` is provided (cards inside the
  FAVORIS modal), pressing the card **opens the game details modal** (instead of removing
  the bookmark) and the details modal exposes a trash button that removes the game from the
  favorites. The bookmark pill in the top-right corner still removes the game directly
  (with the exit animation).

## Props

| Prop                    | Type                    | Default | Description                                             |
| ----------------------- | ----------------------- | ------- | ------------------------------------------------------- |
| `data`                  | `GameFormatted`         | —       | Game data                                               |
| `showDate`              | `boolean`               | `false` | Show date in time text                                  |
| `showScores`            | `boolean`               | —       | Show scores (overrides cache)                           |
| `forceShowScores`       | `boolean`               | `false` | Always show scores                                      |
| `onSelection`           | `(game) => void`        | —       | Selection callback                                      |
| `onRemoveFromFavorites` | `(game) => void`        | —       | Favorites mode: card press opens details, removal button |
| `isSelected`            | `boolean`               | —       | Override selection state                                |
| `animateExit`           | `boolean`               | `false` | Animate on exit                                         |
| `animateEntry`          | `boolean`               | `false` | Animate on entry                                        |
| `verticalMode`          | `boolean`               | `false` | Vertical layout                                         |
| `showTime`              | `boolean`               | `false` | Show time in time text                                  |
| `delay`                 | `number`                | `0`     | Entry animation delay                                   |
| `homeGameVisibility`    | `HomeGameFilter`        | `'all'` | Home/away filter                                        |

## Key Functions

### `internalHandleSelection()`

Toggles the game in the bookmarked selection:

- Matches games by teams + exact UTC date/time
- Max 10 games
- Saves to cache, dispatches `gamesSelectedUpdated`, syncs to Firestore

### `animateExitThen(action)`

Plays the exit animation (`fadeAnim` + `scaleAnim`, 300 ms) when `animateExit` is enabled and
then runs `action` in the completion callback; when `animateExit` is false it runs `action`
immediately. Shared by the card press handler and the bookmark pill so both use the exact
same exit behavior.

### `getAdaptiveColor(c1, c2)`

Picks the darkest color in light mode, lightest in dark mode.

### `getBrightness(hexColor)`

Computes perceived brightness of a hex color.

### `formatColor(c)`

Ensures a color starts with `#`.

## Time Text Logic

The `timeText` is determined by game status:

1. **Finalization** (no score, live status, started 4h+ ago) → `"Finalisation"`
2. **Postponed** → `"Match reporté"`
3. **Interrupted/Delayed** (rain delay, suspended) → `"Match interrompu"` (translated `delayedGame`)
4. **Finished/Final with score** → date/time or `"Détails du match"`
5. **Started 4h+ ago** → game status / period
6. **Live** → `"{clock} - {period}"` or `"En cours"`
7. **Has score** → `"Final"` or period info
8. **Scheduled** → start time

Interrupted/delayed games (`GameStatus.DELAYED`) are excluded from the live badge (no pulsing dot) since they aren't actively in progress.

## Data Flow

1. Receives game data via props
2. Computes display state (live, final, selected, favorite, favorites-details mode)
3. Renders card with team logos, scores, time, arena
4. Handles user interactions (favorite, bookmark, modal). In favorites-details mode
   (`onRemoveFromFavorites` set) a card press opens `GameModal` whose trash button removes the
   game, while the bookmark pill removes it directly.
5. Syncs selections to cache and Firestore
