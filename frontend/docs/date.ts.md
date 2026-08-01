# File: `frontend/utils/date.ts`

## Purpose

The **date** utility provides date formatting and game status helper functions.

## Key Functions

### `readableDate(date)`

Formats a `Date` or date string to `YYYY-MM-DD` format.

```typescript
export const readableDate = (date: string | Date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```

### `getHourGame(startTimeUTC, venueUTCOffset)`

Converts a UTC start time to the venue's local time, returning `"HH:MM"` format.

### `addDays(date, nbDay)`

Adds a number of days to a date and returns the result as a string.

### `getGamesStatus(game)`

Determines the status of a game based on the current time and the game's league duration:

1. If `gameStatus` contains `FINAL`, `FINISHED`, or `ENDED` → `GameStatus.FINISHED`
2. If current time > end time (start + league duration) → `GameStatus.FINAL`
3. If current time >= start time → `GameStatus.IN_PROGRESS`
4. Otherwise → `GameStatus.SCHEDULED`

Uses `timeDurationEnum[game.league]` to determine the game duration (defaults to 2.5 hours).
