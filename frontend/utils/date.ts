import { GameStatus, timeDurationEnum } from "@/constants/enum";
import { FilterGames, GameFormatted } from "@/utils/types";

export const readableDate = (date: string | Date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getHourGame = (
  startTimeUTC: string | Date,
  venueUTCOffset: string,
) => {
  const timeToRemove = Number(
    venueUTCOffset.replace(":", ".").replace("-", ""),
  );
  const starTime = new Date(startTimeUTC);
  const getCorrectDate = starTime.setHours(starTime.getHours() - timeToRemove);
  const hourStart = new Date(getCorrectDate)
    .getUTCHours()
    .toString()
    .padStart(2, "0");
  const minStart = new Date(getCorrectDate)
    .getMinutes()
    .toString()
    .padStart(2, "0");
  return `${hourStart}:${minStart}`;
};

export const addDays = (date: string | Date, nbDay: number) => {
  const day = new Date(date);
  day.setDate(day.getDate() + nbDay);
  return day.toString();
};

export const getGamesStatus = (game: GameFormatted) => {
  const now = new Date();
  const startTime = new Date(game.startTimeUTC);
  const duration =
    timeDurationEnum[game.league as keyof typeof timeDurationEnum] ?? 2.5;
  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + duration);

  const gameStatus = game.gameStatus?.toUpperCase();

  if (
    gameStatus?.includes("FINAL") ||
    gameStatus?.includes("FINISHED") ||
    gameStatus?.includes("ENDED")
  ) {
    return GameStatus.FINISHED;
  }

  // Temporarily interrupted game (rain delay / suspended): stays visible with its
  // own status so the card can show the translated "interrupted / delayed" badge.
  if (
    gameStatus?.includes("DELAY") ||
    gameStatus?.includes("SUSPEND") ||
    gameStatus?.includes("RAIN") ||
    gameStatus?.includes("WEATHER")
  ) {
    return GameStatus.DELAYED;
  }

  if (now > endTime) {
    return GameStatus.FINAL;
  }

  if (now >= startTime) {
    return GameStatus.IN_PROGRESS;
  }

  return GameStatus.SCHEDULED;
};

/** Outcome of one finished game, from a given team's point of view. */
export type GameOutcome = "W" | "L" | "D";

/** Number of dots displayed by the "recent form" row. */
export const RECENT_FORM_LENGTH = 5;

/** Leagues that play an overtime/shootout and therefore have no real tie. */
const OVERTIME_LEAGUES = ["NHL", "PWHL", "NCAAMH", "NCAAWH"];

/**
 * Whether a hockey game was decided in overtime or a shootout, in which case a
 * loss is an **overtime loss** (`otLosses` in the team's record, the third number
 * of the `"W-L-OTL"` string shown next to the team).
 *
 * Two signals, because neither is always present in the stored document:
 * - `gamePeriod > 3` — the period counter written by the live-score sync, the
 *   exact signal `GameService._nextRecord()` uses on the backend;
 * - the raw status mentioning `OT` / `SO` / `OVERTIME` / `SHOOTOUT` (e.g. `"Final/OT"`,
 *   `"2nd OT"`), for games whose `gamePeriod` was never synced.
 *
 * Word boundaries matter: a bare `includes('OT')` would also match unrelated
 * statuses, so the tokens are matched as standalone words.
 */
const isOvertimeGame = (game: GameFormatted): boolean => {
  if (!OVERTIME_LEAGUES.includes((game.league ?? "").toUpperCase()))
    return false;
  if (typeof game.gamePeriod === "number" && game.gamePeriod > 3) return true;
  const rawStatus = (game.gameStatus ?? "").toUpperCase();
  return /(^|[^A-Z])(OT|SO|OVERTIME|SHOOTOUT)([^A-Z]|$)/.test(rawStatus);
};

/**
 * Builds the last `limit` results of `teamId`, **oldest first**, from the
 * `{ [date]: GameFormatted[] }` payload of `GET /games/team/:id/results`.
 *
 * Key points:
 * - The object keys are the API's date buckets; they are discarded and the games
 *   are re-sorted by `startTimeUTC` **descending**, then the list is sliced and
 *   reversed so the caller receives oldest → newest (the reading order of the row).
 * - **Only finished games count.** The endpoint merely filters on non-null
 *   scores, so a live game that already has a partial score would otherwise be
 *   counted as a loss. `getGamesStatus()` is reused, but its time-based fallback
 *   (a game older than its duration reports `FINAL` even while the provider
 *   still says `IN_PROGRESS`) is deliberately overridden: any status that
 *   explicitly says the game is not over yet is rejected outright.
 * - An overtime / shootout **loss** is shown as a **draw**, not as a defeat:
 *   losing in OT (`otLosses`, the third figure of the team's `"W-L-OTL"` record)
 *   is the closest thing to a tie those leagues have, and the dot row has no
 *   separate OT bucket. See `isOvertimeGame()`.
 * - Fewer than `limit` games simply yields a shorter array (the caller renders
 *   only what it gets).
 */
export const getRecentForm = (
  results: GameFormatted[] | FilterGames | null | undefined,
  teamId: string,
  limit: number = RECENT_FORM_LENGTH,
  excludeUniqueId?: string,
): GameOutcome[] => {
  if (!results || !teamId) return [];

  // Accepts both the flat array of `GET /games/team/:id/form` and the
  // `{ [date]: GameFormatted[] }` payload of `GET /games/team/:id/results`.
  const games: GameFormatted[] = Array.isArray(results)
    ? results
    : Object.values(results).flat();

  const finished: GameFormatted[] = [];
  // A single match can be stored twice: each upstream feed writes its own
  // document for the team it was asked about, and the two differ by `uniqueId`
  // (that id is prefixed with the selected team). The backend collapses them,
  // but a payload cached *before* it did — a past row lives in the cache for
  // 24 h — would still count a result twice and fill two dots with one game.
  // The stable identity of a match is the pair of teams plus its start time.
  const seenMatches = new Set<string>();
  for (const game of games) {
    if (!game) continue;
    // The API already excludes the displayed game (`startTimeUTC < before`), but
    // the row must describe the games played *before* it whatever the payload
    // contains, so the id is dropped defensively.
    if (excludeUniqueId && game.uniqueId === excludeUniqueId) continue;
    // A raw status that still says "not over" wins over the time-based
    // fallback of `getGamesStatus` (which reports FINAL once the duration
    // elapsed), so a stalled live game is never counted as a finished loss.
    const rawStatus = (game.gameStatus ?? "").toUpperCase();
    const saysNotOver =
      rawStatus.includes("SCHEDULED") ||
      rawStatus.includes("IN_PROGRESS") ||
      rawStatus.includes("PRE") ||
      rawStatus.includes("POSTPONED") ||
      rawStatus.includes("CANCELLED") ||
      rawStatus.includes("DELAY") ||
      rawStatus.includes("SUSPEND") ||
      rawStatus.includes("RAIN");
    if (saysNotOver) continue;

    const status = getGamesStatus(game);
    if (status !== GameStatus.FINISHED && status !== GameStatus.FINAL) continue;
    if (game.homeTeamScore === null || game.homeTeamScore === undefined)
      continue;
    if (game.awayTeamScore === null || game.awayTeamScore === undefined)
      continue;

    const matchKey = `${game.homeTeamId}-${game.awayTeamId}-${game.startTimeUTC}`;
    if (seenMatches.has(matchKey)) continue;
    seenMatches.add(matchKey);

    // Defensive: the payload comes from a query already restricted to this
    // team, so a game it does not play has no business in the row.
    if (game.homeTeamId !== teamId && game.awayTeamId !== teamId) continue;

    finished.push(game);
  }

  finished.sort(
    (a, b) =>
      new Date(b.startTimeUTC).getTime() - new Date(a.startTimeUTC).getTime(),
  );

  return finished
    .slice(0, limit)
    .reverse()
    .map((game) => {
      // Only `homeTeamId`/`awayTeamId` say which side the team played.
      // `teamSelectedId` must NOT be used here: it is merely the team the
      // upstream feed was asked about, so on one of the two documents stored
      // for a match it is this team while `homeTeamId` says it was the *away*
      // one — which inverted the score and turned a win into a loss.
      const isHome = game.homeTeamId === teamId;
      const teamScore = isHome ? game.homeTeamScore! : game.awayTeamScore!;
      const opponentScore = isHome ? game.awayTeamScore! : game.homeTeamScore!;
      if (teamScore > opponentScore) return "W";
      if (teamScore < opponentScore) return isOvertimeGame(game) ? "D" : "L";
      return "D";
    });
};
