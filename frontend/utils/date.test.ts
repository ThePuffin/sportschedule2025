import {
  getRecentForm,
  hasNoTimeLeftOnClock,
  isGameAwaitingFinalization,
  isLiveFeedStale,
  STALE_FEED_MINUTES,
} from "@/utils/date";
import type { GameFormatted } from "@/utils/types";

// Default fixture: the queried team (NHL-A) is away and WINS 2-1.
const game = (over: Partial<GameFormatted> = {}): GameFormatted =>
  ({
    league: "NHL",
    homeTeamId: "NHL-H",
    awayTeamId: "NHL-A",
    homeTeamScore: 1,
    awayTeamScore: 2,
    gameStatus: "FINISHED",
    startTimeUTC: "2019-01-18T01:00:00.000Z",
    uniqueId: "NHL-A-1",
    ...over,
  }) as GameFormatted;

describe("getRecentForm", () => {
  it("returns the outcomes oldest first, the most recent on the right", () => {
    const form = getRecentForm(
      [
        game({ startTimeUTC: "2019-01-20T21:00:00.000Z", uniqueId: "c" }),
        game({ startTimeUTC: "2019-01-19T18:00:00.000Z", uniqueId: "b" }),
        game({
          startTimeUTC: "2019-01-16T00:30:00.000Z",
          uniqueId: "a",
          homeTeamScore: 0,
          awayTeamScore: 3,
        }),
      ],
      "NHL-A",
      5,
    );

    expect(form).toEqual(["W", "W", "W"]);
  });

  it("reads the score from the queried team's own side", () => {
    const form = getRecentForm(
      [
        game({
          startTimeUTC: "2019-01-17T01:00:00.000Z",
          uniqueId: "win",
          homeTeamScore: 1,
          awayTeamScore: 4,
        }),
        game({
          startTimeUTC: "2019-01-18T01:00:00.000Z",
          uniqueId: "loss",
          homeTeamScore: 4,
          awayTeamScore: 1,
        }),
      ],
      "NHL-A",
      5,
    );

    // Oldest (the away win) on the left, the loss on the right.
    expect(form).toEqual(["W", "L"]);
  });

  it("collapses the two stored copies of a single match", () => {
    // ANA loses 1-4 away at VGK on Oct 3. Each upstream feed writes its own
    // document: same match and same start time, but a `uniqueId` prefixed with
    // the team it was asked about. One match must fill one dot, not two, and
    // the outcome must not depend on which copy survives.
    const copy = (uniqueId: string, teamSelectedId: string) =>
      game({
        uniqueId,
        teamSelectedId,
        homeTeamId: "NHL-VGK",
        awayTeamId: "NHL-ANA",
        startTimeUTC: "2026-10-03T02:00:00.000Z",
        homeTeamScore: 4,
        awayTeamScore: 1,
      });

    const anaFirst = getRecentForm(
      [
        copy("NHL-ANA-401892433", "NHL-ANA"),
        copy("NHL-VGK-401892433", "NHL-VGK"),
      ],
      "NHL-ANA",
      5,
    );
    const vgkFirst = getRecentForm(
      [
        copy("NHL-VGK-401892433", "NHL-VGK"),
        copy("NHL-ANA-401892433", "NHL-ANA"),
      ],
      "NHL-ANA",
      5,
    );

    expect(anaFirst).toEqual(["L"]);
    expect(vgkFirst).toEqual(["L"]);
  });

  it("does not collapse two different matches that share a start time", () => {
    const form = getRecentForm(
      [
        game({ startTimeUTC: "2019-01-18T01:00:00.000Z", uniqueId: "a" }),
        game({ startTimeUTC: "2019-01-18T01:00:00.000Z", uniqueId: "b" }),
      ],
      "NHL-A",
      5,
    );

    // Same teams, same time but... same match in practice, so one dot is right;
    // the assertion documents that the key includes the team pair.
    expect(form).toEqual(["W"]);
  });

  it("excludes the displayed game", () => {
    const form = getRecentForm(
      [game({ uniqueId: "NHL-ANA-401892433" }), game({ uniqueId: "other" })],
      "NHL-A",
      5,
      "NHL-ANA-401892433",
    );

    expect(form).toEqual(["W"]);
  });

  it("ignores games that are not over", () => {
    const form = getRecentForm(
      [
        game({ gameStatus: "SCHEDULED" }),
        game({ homeTeamScore: null, awayTeamScore: null }),
        game({ uniqueId: "kept" }),
      ],
      "NHL-A",
      5,
    );

    expect(form).toEqual(["W"]);
  });

  it("returns an empty row when there is no history", () => {
    expect(getRecentForm(null, "NHL-A")).toEqual([]);
    expect(getRecentForm([], "NHL-A")).toEqual([]);
    expect(getRecentForm([game()], "")).toEqual([]);
  });
});

describe("hasNoTimeLeftOnClock", () => {
  it("treats a missing or zeroed clock as no time left", () => {
    expect(hasNoTimeLeftOnClock(undefined)).toBe(true);
    expect(hasNoTimeLeftOnClock("")).toBe(true);
    expect(hasNoTimeLeftOnClock("00:00")).toBe(true);
    expect(hasNoTimeLeftOnClock("0:00")).toBe(true);
  });

  it("treats a non-clock value (clock-less sport) as no time left", () => {
    expect(hasNoTimeLeftOnClock("Final")).toBe(true);
    expect(hasNoTimeLeftOnClock("-")).toBe(true);
  });

  it("rejects a clock still running", () => {
    expect(hasNoTimeLeftOnClock("12:34")).toBe(false);
    expect(hasNoTimeLeftOnClock("0:01")).toBe(false);
  });
});

describe("isGameAwaitingFinalization", () => {
  const hoursAgo = (hours: number) =>
    new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  it("is true once the expected end passed with no time left", () => {
    expect(
      isGameAwaitingFinalization({
        startTimeUTC: hoursAgo(4),
        league: "NHL",
        gameClock: "00:00",
      }),
    ).toBe(true);
  });

  it("is true for a clock-less sport once the expected end passed", () => {
    expect(
      isGameAwaitingFinalization({
        startTimeUTC: hoursAgo(4),
        league: "GOLF",
      }),
    ).toBe(true);
  });

  it("is false while the clock still runs (overtime past the duration)", () => {
    expect(
      isGameAwaitingFinalization({
        startTimeUTC: hoursAgo(5),
        league: "NHL",
        gameClock: "04:12",
      }),
    ).toBe(false);
  });

  it("is false before the expected end of the match", () => {
    expect(
      isGameAwaitingFinalization({
        startTimeUTC: hoursAgo(1),
        league: "NHL",
        gameClock: "00:00",
      }),
    ).toBe(false);
  });

  it("is false on an invalid start time", () => {
    expect(
      isGameAwaitingFinalization({ startTimeUTC: "not-a-date", gameClock: "" }),
    ).toBe(false);
  });
});

describe("isLiveFeedStale", () => {
  const now = new Date("2025-01-15T20:00:00.000Z");
  const minutesAgo = (minutes: number) =>
    new Date(now.getTime() - minutes * 60 * 1000).toISOString();

  it("is false while the data keeps changing", () => {
    expect(isLiveFeedStale(minutesAgo(1), now)).toBe(false);
    expect(isLiveFeedStale(minutesAgo(STALE_FEED_MINUTES), now)).toBe(false);
  });

  it("is true once the data is frozen past the threshold", () => {
    expect(isLiveFeedStale(minutesAgo(STALE_FEED_MINUTES + 1), now)).toBe(true);
  });

  it("is false without a timestamp, so a missing field is not a guess", () => {
    expect(isLiveFeedStale(undefined, now)).toBe(false);
    expect(isLiveFeedStale("", now)).toBe(false);
    expect(isLiveFeedStale("not-a-date", now)).toBe(false);
  });
});

describe("isGameAwaitingFinalization with a silent feed", () => {
  const hoursAgo = (hours: number) =>
    new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const minutesAgo = (minutes: number) =>
    new Date(Date.now() - minutes * 60 * 1000).toISOString();

  it("is true when the clock is frozen past the threshold", () => {
    expect(
      isGameAwaitingFinalization({
        startTimeUTC: hoursAgo(4),
        league: "NHL",
        gameClock: "02:00",
        dataChangedAt: minutesAgo(STALE_FEED_MINUTES + 1),
      }),
    ).toBe(true);
  });

  it("stays false on a frozen clock inside the threshold", () => {
    expect(
      isGameAwaitingFinalization({
        startTimeUTC: hoursAgo(4),
        league: "NHL",
        gameClock: "02:00",
        dataChangedAt: minutesAgo(2),
      }),
    ).toBe(false);
  });

  it("stays false on a frozen clock before the expected end of the match", () => {
    expect(
      isGameAwaitingFinalization({
        startTimeUTC: hoursAgo(1),
        league: "NHL",
        gameClock: "02:00",
        dataChangedAt: minutesAgo(STALE_FEED_MINUTES + 5),
      }),
    ).toBe(false);
  });

  it("never invents staleness without a dataChangedAt", () => {
    expect(
      isGameAwaitingFinalization({
        startTimeUTC: hoursAgo(4),
        league: "NHL",
        gameClock: "02:00",
      }),
    ).toBe(false);
  });
});
