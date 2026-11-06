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
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
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
2. If `gameStatus` contains `DELAY`/`SUSPEND`/`RAIN`/`WEATHER` (temporarily interrupted) → `GameStatus.DELAYED`
3. If current time > end time (start + league duration) → `GameStatus.FINAL`
4. If current time >= start time → `GameStatus.IN_PROGRESS`
5. Otherwise → `GameStatus.SCHEDULED`

Uses `timeDurationEnum[game.league]` to determine the game duration (defaults to 2.5 hours).

### `hasNoTimeLeftOnClock(gameClock?)`

Whether the game clock reports **no time left**. A missing clock (`undefined`, empty, `-`) means the
sport has no running clock (golf, tennis, racing...) and counts as "no time left"; a non-clock string
(`"Final"`) does too. A clock matching `M:SS` counts as "no time left" only when both parts are `0`
(`"00:00"`, `"0:00"`); any other value (`"12:34"`, `"0:01"`) is a running clock.

### `STALE_FEED_MINUTES`

`15` — how long a live feed may keep reporting the exact same clock/score before it is considered gone
silent. 15 minutes is deliberate: a live clock never legitimately stands still that long once a game is
past its expected end, while the app polls every 30 s, so a much shorter threshold would fire on a slow
provider rather than on a stuck one.

### `isLiveFeedStale(dataChangedAt?, now = new Date())`

Whether the provider's data has been frozen for longer than `STALE_FEED_MINUTES`, based on
`dataChangedAt` — the instant `gameClock` / `gamePeriod` / scores / status last **actually changed
value** (`updateDate` is rewritten on every sync and therefore says nothing about staleness).

Returns `false` when `dataChangedAt` is absent or unparsable (documents synced before the field
existed): absence is not evidence of a stuck feed, so the UI keeps trusting the clock instead of
guessing.

### `isGameAwaitingFinalization({ startTimeUTC, league?, gameClock?, dataChangedAt? })`

`true` when **both** conditions hold:

1. the **expected end of the match** has passed — `now > startTimeUTC + timeDurationEnum[league]`
   (defaults to 2.5 h), with the same duration table as `getGamesStatus()`;
2. **the feed tells us nothing more**, i.e. either `hasNoTimeLeftOnClock(gameClock)` is `true`
   (clock at zero, or no clock at all for clock-less sports) **or** `isLiveFeedStale(dataChangedAt)`
   is `true` (the clock is frozen at `"02:00"` because the provider stopped updating).

Returns `false` on an unparsable `startTimeUTC`. This is what gates the `"Finalisation"` label (the
provider never sent a score) in `CardLarge` and `GameModal`: a game still running its overtime or
interrupted by a rain delay past its duration is **not** awaiting finalization, and neither is a game
whose feed simply updated 2 minutes ago.

### `getRecentForm(results, teamId, limit = RECENT_FORM_LENGTH, excludeUniqueId?)`

Builds the last `limit` results of `teamId`, **oldest first**, as `('W' | 'L' | 'D')[]`. Accepts both
the flat `GameFormatted[]` of `GET /games/team/:id/form` (what `GameModal` uses) and the legacy
`{ [date]: GameFormatted[] }` payload of `GET /games/team/:id/results`.

- `excludeUniqueId` drops one game from the input. The `/form` endpoint already excludes the displayed
  game through its **strict** `startTimeUTC < before` bound, but an upcoming game is requested without
  any bound, so the id is still passed as a defensive measure: the row must describe the games played
  **before** it whatever the payload contains.
- Games are re-sorted by `startTimeUTC` **descending**, then sliced and reversed so the caller receives
  the reading order of the form row.
- **Only finished games count.** The `/form` endpoint already drops games missing either score, but a
  game carrying a **partial** score would otherwise be counted as a loss. Two guards apply, in this
  order:
  1. the **raw** `gameStatus` is rejected first when it still says the game is not over
     (`SCHEDULED` / `IN_PROGRESS` / `PRE` / `POSTPONED` / `CANCELLED` / `DELAY` / `SUSPEND` / `RAIN`).
     This deliberately overrides the time-based fallback of `getGamesStatus()`, which reports `FINAL`
     once the expected duration has elapsed — otherwise a stalled live game would be counted;
  2. then `getGamesStatus(game)` must be `FINISHED` or `FINAL`.
- Scores must both be non-null.
- **A game the team does not play is skipped.** The `/form` payload is already restricted to the team,
  so this only guards a hand-built or legacy payload.
- **Deduplication on `${homeTeamId}-${awayTeamId}-${startTimeUTC}`.** A finished match is stored
  **twice** in the database — each upstream feed writes its own document for the team it was asked
  about — and the two copies differ by `uniqueId`, which is prefixed with that selected team
  (`NHL-ANA-401892433` vs `NHL-VGK-401892433`). `uniqueId` therefore cannot identify a match, and the
  pair of teams plus the start time can. The backend collapses them, but a payload cached _before_ it
  did (a past row lives in the cache for 24 h) would otherwise count one result twice.
- Outcome is read **from the team's point of view**, and `homeTeamId === teamId` alone decides which
  side is ours. `teamSelectedId` must **not** be used for this: it only records the team the feed was
  asked about, so on one of the two documents of a match it equals `teamId` while `homeTeamId` says
  the team was the **away** one — which read the score backwards and turned a win into a loss (and a
  loss into a win), non-deterministically since which copy survives the sort is arbitrary.
- An **overtime / shootout loss** is shown as a **draw**, not as a defeat. Those leagues
  (`NHL`, `PWHL`, `NCAAMH`, `NCAAWH`) have no real tie, and losing in overtime is the `otLosses`
  figure of the team's `"W-L-OTL"` record — so the dot row shows a half-filled dot. `isOvertimeGame()`
  uses two signals: `gamePeriod > 3` (the same signal `GameService._nextRecord()` uses on the backend)
  or a raw status carrying `OT` / `SO` / `OVERTIME` / `SHOOTOUT` as standalone words, for games whose
  `gamePeriod` was never synced. The check is restricted to those leagues, so a baseball game reaching
  a 5th period is never mistaken for an overtime loss.
- Returns a shorter array when the team has fewer than `limit` stored games, and `[]` when there is
  no payload or no team id.
