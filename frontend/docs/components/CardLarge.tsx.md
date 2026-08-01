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

## Props

| Prop                 | Type             | Default | Description                   |
| -------------------- | ---------------- | ------- | ----------------------------- |
| `data`               | `GameFormatted`  | —       | Game data                     |
| `showDate`           | `boolean`        | `false` | Show date in time text        |
| `showScores`         | `boolean`        | —       | Show scores (overrides cache) |
| `forceShowScores`    | `boolean`        | `false` | Always show scores            |
| `onSelection`        | `(game) => void` | —       | Selection callback            |
| `isSelected`         | `boolean`        | —       | Override selection state      |
| `animateExit`        | `boolean`        | `false` | Animate on exit               |
| `animateEntry`       | `boolean`        | `false` | Animate on entry              |
| `verticalMode`       | `boolean`        | `false` | Vertical layout               |
| `showTime`           | `boolean`        | `false` | Show time in time text        |
| `delay`              | `number`         | `0`     | Entry animation delay         |
| `homeGameVisibility` | `HomeGameFilter` | `'all'` | Home/away filter              |

## Key Functions

### `internalHandleSelection()`

Toggles the game in the bookmarked selection:

- Matches games by teams + exact UTC date/time
- Max 10 games
- Saves to cache, dispatches `gamesSelectedUpdated`, syncs to Firestore

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
3. **Finished/Final with score** → date/time or `"Détails du match"`
4. **Started 4h+ ago** → game status / period
5. **Live** → `"{clock} - {period}"` or `"En cours"`
6. **Has score** → `"Final"` or period info
7. **Scheduled** → start time

## Data Flow

1. Receives game data via props
2. Computes display state (live, final, selected, favorite)
3. Renders card with team logos, scores, time, arena
4. Handles user interactions (favorite, bookmark, modal)
5. Syncs selections to cache and Firestore
