# File: `frontend/utils/types.tsx`

## Purpose

The **types** file defines all shared TypeScript interfaces used across the frontend application.

## Interfaces

### `GameFormatted`

Represents a formatted game object returned by the API:

| Field                     | Type             | Description                              |
| ------------------------- | ---------------- | ---------------------------------------- |
| `_id?`                    | `string`         | MongoDB ID                               |
| `uniqueId`                | `string`         | Unique game identifier                   |
| `awayTeamId`              | `string`         | Away team ID                             |
| `awayTeam`                | `string`         | Away team name                           |
| `awayTeamShort`           | `string`         | Away team abbreviation                   |
| `awayTeamLogo`            | `string`         | Away team logo URL                       |
| `awayTeamLogoDark?`       | `string`         | Dark mode logo URL                       |
| `awayTeamScore`           | `number \| null` | Away team score                          |
| `awayTeamRecord?`         | `string`         | Away team record                         |
| `homeTeamId`              | `string`         | Home team ID                             |
| `homeTeam`                | `string`         | Home team name                           |
| `homeTeamShort`           | `string`         | Home team abbreviation                   |
| `homeTeamScore`           | `number \| null` | Home team score                          |
| `homeTeamLogo`            | `string`         | Home team logo URL                       |
| `homeTeamLogoDark?`       | `string`         | Dark mode logo URL                       |
| `homeTeamRecord?`         | `string`         | Home team record                         |
| `arenaName`               | `string`         | Arena name                               |
| `placeName`               | `string`         | City/place name                          |
| `gameDate`                | `string`         | Game date (YYYY-MM-DD)                   |
| `teamSelectedId`          | `string`         | Team ID used for selection               |
| `startTimeUTC`            | `string`         | Start time in UTC                        |
| `show`                    | `boolean`        | Whether to show the game                 |
| `selectedTeam`            | `boolean`        | Whether the team is selected             |
| `league`                  | `string`         | League name                              |
| `updateDate?`             | `Date`           | Last update timestamp                    |
| `venueTimezone?`          | `string`         | Venue timezone                           |
| `isActive?`               | `boolean`        | Whether the game is active               |
| `urlLive?`                | `string`         | Live stream URL                          |
| `color`                   | `string`         | Team color                               |
| `backgroundColor`         | `string`         | Team background color                    |
| `awayTeamColor`           | `string`         | Away team color                          |
| `awayTeamBackgroundColor` | `string`         | Away team background color               |
| `homeTeamColor`           | `string`         | Home team color                          |
| `homeTeamBackgroundColor` | `string`         | Home team background color               |
| `gameStatus?`             | `string`         | Game status (e.g., "FINAL", "1st", "OT") |
| `gameClock?`              | `string`         | Game clock                               |
| `gamePeriod?`             | `number`         | Game period                              |

### `League`

```typescript
interface League {
  label: string;
  value: string;
  uniqueId: string;
}
```

### `Team`

Represents a team with metadata:

| Field                      | Type     | Description      |
| -------------------------- | -------- | ---------------- |
| `uniqueId`                 | `string` | Unique team ID   |
| `value`                    | `string` | Team value       |
| `id`                       | `string` | Team ID          |
| `label`                    | `string` | Display label    |
| `teamLogo`                 | `string` | Logo URL         |
| `teamCommonName`           | `string` | Common name      |
| `conferenceName`           | `string` | Conference       |
| `divisionName`             | `string` | Division         |
| `league`                   | `string` | League name      |
| `abbrev`                   | `string` | Abbreviation     |
| `updateDate`               | `string` | Last update      |
| `record?`                  | `string` | Team record      |
| `color?`                   | `string` | Team color       |
| `backgroundColor?`         | `string` | Background color |
| `awayTeamColor?`           | `string` | Away color       |
| `awayTeamBackgroundColor?` | `string` | Away background  |
| `homeTeamColor?`           | `string` | Home color       |
| `homeTeamBackgroundColor?` | `string` | Home background  |
| `teamLogoDark?`            | `string` | Dark mode logo   |
| `wins?`                    | `number` | Wins             |
| `losses?`                  | `number` | Losses           |
| `ties?`                    | `number` | Ties             |
| `otLosses?`                | `number` | OT losses        |

### `FilterGames`

```typescript
interface FilterGames {
  [date: string]: GameFormatted[];
}
```

### `AccordionProps`

Props for the `Accordion` component.

### `ButtonsProps`

Props for the buttons component.

### `DateRangePickerProps`

Props for the date range picker.

### `IconButtonProps`

Props for icon buttons (extends `ButtonProps`).

### `GamesSelectedProps`

Props for the games selected component.

### `SelectorProps`

Props for the selector component.

### `CardsProps`

Props for the card components.
