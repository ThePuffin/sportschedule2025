# File: `frontend/components/Accordion.tsx`

## Purpose

The **Accordion** component displays a collapsible section with a title, an event count badge, and a grid of game cards. It's used across all tabs to group games by date, hour, or month.

## Key Features

- **Collapsible** — expand/collapse via chevron icon
- **Event count badge** — shows the number of games
- **Responsive grid** — 3 columns on desktop, 1 column on mobile
- **Game cards** — renders `CardLarge` for each game
- **Scroll offset** — accounts for sticky filter header height
- **Selection support** — highlights selected games
- **No results** — shows `NoResults` component when empty

## Props

| Prop                  | Type              | Default | Description                            |
| --------------------- | ----------------- | ------- | -------------------------------------- |
| `i`                   | `number`          | `0`     | Index (used for default open state)    |
| `filter`              | `string`          | `''`    | Title text (uppercased)                |
| `gamesFiltred`        | `GameFormatted[]` | `[]`    | Games to display                       |
| `open`                | `boolean`         | `false` | Whether expanded                       |
| `showDate`            | `boolean`         | `false` | Show date on cards                     |
| `disableToggle`       | `boolean`         | `false` | Disable collapse                       |
| `showScores`          | `boolean`         | —       | Show scores on cards                   |
| `gamesSelected`       | `GameFormatted[]` | —       | Bookmarked games                       |
| `onSelection`         | `(game) => void`  | —       | Selection callback                     |
| `showTime`            | `boolean`         | `false` | Show time on cards                     |
| `forceShowScores`     | `boolean`         | `false` | Always show scores                     |
| `filtersHeaderHeight` | `number`          | `0`     | Sticky header height for scroll offset |
| `homeGameVisibility`  | `HomeGameFilter`  | `false` | Home/away filter                       |

## Key Functions

### `makeCards()`

Renders the game cards grid:

- Returns `NoResults` if no games
- Maps each game to a `CardLarge` with:
  - `id="game-{uniqueId}"` for scroll targeting
  - `scrollMarginTop` based on sticky header height
  - Selection state detection (matches by teams + UTC date/time)
  - Entry animation with staggered delay

## Data Flow

1. Receives games and display options via props
2. `useEffect` syncs `expanded` state with `open` prop
3. Renders `ListItem.Accordion` with title + badge
4. Renders game cards in a responsive flex grid
