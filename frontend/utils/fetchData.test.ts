import {
  fetchRemainingGamesByTeam,
  fetchRecentFormGames,
  fetchResultsByTeam,
  fetchGamesByLeagueDay,
  fetchSelectableTeams,
  getCanonicalTeamId,
  getOlympicTeamIds,
  groupOlympicTeams,
  restrictToSelectableTeams,
  teamsMatchSelection,
} from "./fetchData";
import { Team } from "./types";

// --- localStorage mock (same shape as syncService.test.ts) ---
class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

const localStorageMock = new LocalStorageMock();
const mockFetch = jest.fn();

/** Two finished games, as the backend `/form` endpoint returns them. */
const FORM_PAYLOAD = [{ uniqueId: "g1" }, { uniqueId: "g2" }];

const mockSuccessfulFetch = (payload: unknown = FORM_PAYLOAD) => {
  mockFetch.mockResolvedValue({ json: async () => payload });
};

const lastRequestedUrl = () =>
  mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0] as string;

const olympicTeam = (uniqueId: string, label: string, league: string): Team => ({
  uniqueId,
  id: uniqueId,
  label,
  teamLogo: "",
  teamCommonName: label,
  league,
  abbrev: uniqueId.split("-").at(-1) ?? "",
  updateDate: "",
});

beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    value: localStorageMock,
    writable: true,
  });
  Object.defineProperty(globalThis, "fetch", {
    value: mockFetch,
    writable: true,
  });
});

describe("Olympic team identity helpers", () => {
  it("expands one Olympic country id to its hockey and basketball ids", () => {
    expect(getOlympicTeamIds("OLYMPICS-HOCKEY-MEN-FRA")).toEqual([
      "OLYMPICS-HOCKEY-MEN-FRA",
      "OLYMPICS-BASKETBALL-MEN-FRA",
    ]);
    expect(getOlympicTeamIds("OLYMPICS-BASKETBALL-WOMEN-USA")).toEqual([
      "OLYMPICS-HOCKEY-WOMEN-USA",
      "OLYMPICS-BASKETBALL-WOMEN-USA",
    ]);
    expect(getOlympicTeamIds("NHL-BOS")).toEqual(["NHL-BOS"]);
  });

  it("groups duplicate Olympic country entries while keeping gender variants separate", () => {
    const teams = [
      olympicTeam("OLYMPICS-HOCKEY-MEN-FRA", "France", "OLYMPICS-MEN"),
      olympicTeam("OLYMPICS-BASKETBALL-MEN-FRA", "France", "OLYMPICS-MEN"),
      olympicTeam("OLYMPICS-BASKETBALL-WOMEN-FRA", "France", "OLYMPICS-WOMEN"),
      olympicTeam("NHL-FRA", "France", "NHL"),
    ];

    expect(groupOlympicTeams(teams).map((team) => team.uniqueId)).toEqual([
      "OLYMPICS-BASKETBALL-MEN-FRA",
      "OLYMPICS-BASKETBALL-WOMEN-FRA",
      "NHL-FRA",
    ]);
    expect(groupOlympicTeams(teams).map((team) => team.label)).toEqual(["France", "France", "France"]);
    expect(groupOlympicTeams(groupOlympicTeams(teams)).map((team) => team.label)).toEqual([
      "France",
      "France",
      "France",
    ]);
    expect(getCanonicalTeamId("OLYMPICS-HOCKEY-MEN-FRA", teams)).toBe(
      "OLYMPICS-BASKETBALL-MEN-FRA",
    );
    expect(teamsMatchSelection("OLYMPICS-HOCKEY-MEN-FRA", "OLYMPICS-BASKETBALL-MEN-FRA")).toBe(true);
    expect(teamsMatchSelection("OLYMPICS-HOCKEY-MEN-FRA", "OLYMPICS-BASKETBALL-WOMEN-FRA")).toBe(false);
  });
});

describe("Olympic team schedule requests", () => {
  it("requests remaining games for both Olympic sports", async () => {
    mockSuccessfulFetch({ "2026-02-12": [{ uniqueId: "hockey-game" }, { uniqueId: "basketball-game" }] });

    const result = await fetchRemainingGamesByTeam("OLYMPICS-HOCKEY-MEN-FRA");

    expect(result).toEqual({
      "2026-02-12": [{ uniqueId: "hockey-game" }, { uniqueId: "basketball-game" }],
    });
    expect(lastRequestedUrl()).toContain(
      "/games/team/OLYMPICS-HOCKEY-MEN-FRA,OLYMPICS-BASKETBALL-MEN-FRA?clean=true",
    );
  });

  it("requests results for both Olympic sports", async () => {
    mockSuccessfulFetch({ "2024-08-08": [{ uniqueId: "basketball-game" }] });

    const result = await fetchResultsByTeam("OLYMPICS-HOCKEY-MEN-FRA");

    expect(result).toEqual({ "2024-08-08": [{ uniqueId: "basketball-game" }] });
    expect(lastRequestedUrl()).toContain(
      "/games/team/OLYMPICS-HOCKEY-MEN-FRA,OLYMPICS-BASKETBALL-MEN-FRA/results",
    );
  });

  it("keeps non-Olympic team requests unchanged", async () => {
    mockSuccessfulFetch({});

    await fetchResultsByTeam("NHL-BOS");

    expect(lastRequestedUrl()).toContain("/games/team/NHL-BOS/results");
  });
});

describe("fetchGamesByLeagueDay", () => {
  it("expands Olympic favorite ids so both sports appear in the favorites section", async () => {
    mockSuccessfulFetch({ groups: [] });

    await fetchGamesByLeagueDay("2024-08-08", undefined, undefined, ["OLYMPICS-HOCKEY-MEN-FRA"]);

    const requestUrl = new URL(lastRequestedUrl(), "https://localhost");
    expect(requestUrl.searchParams.get("favoriteTeams")).toBe(
      "OLYMPICS-HOCKEY-MEN-FRA+OLYMPICS-BASKETBALL-MEN-FRA",
    );
  });
});

describe("selectable teams (favorites / Calendar / Schedule team filter)", () => {
  const plainTeam = (uniqueId: string): Team => ({
    uniqueId,
    id: uniqueId,
    label: uniqueId,
    teamLogo: "",
    teamCommonName: uniqueId,
    league: uniqueId.split("-")[0],
    abbrev: "",
    updateDate: "",
  });

  it("requests the restricted list with the shared minGames threshold", async () => {
    mockSuccessfulFetch([plainTeam("NHL-BOS")]);

    const teams = await fetchSelectableTeams();

    expect(teams).toHaveLength(1);
    const url = new URL(lastRequestedUrl(), "https://localhost");
    expect(url.pathname).toBe("/teams");
    // `selectableMinGames` is 4 → "more than 3 games".
    expect(url.searchParams.get("minGames")).toBe("4");
  });

  it("serves the second call from its own cache, not the API", async () => {
    mockSuccessfulFetch([plainTeam("NHL-BOS")]);

    const first = await fetchSelectableTeams();
    const second = await fetchSelectableTeams();

    expect(first).toEqual(second);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  describe("restrictToSelectableTeams", () => {
    const roster = [plainTeam("NHL-BOS"), plainTeam("NHL-VGK"), plainTeam("NCAA-TINY")];
    const selectable = [plainTeam("NHL-BOS"), plainTeam("NHL-VGK")];

    it("keeps only the teams reaching the threshold", () => {
      expect(restrictToSelectableTeams(roster, selectable).map((t) => t.uniqueId)).toEqual([
        "NHL-BOS",
        "NHL-VGK",
      ]);
    });

    it("returns the roster untouched when the selectable list is not loaded", () => {
      // A failed fetch must never lock the user out of every selector.
      expect(restrictToSelectableTeams(roster, [])).toEqual(roster);
      expect(restrictToSelectableTeams(roster, null)).toEqual(roster);
      expect(restrictToSelectableTeams(roster, undefined)).toEqual(roster);
    });

    it("always keeps the current selection even below the threshold", () => {
      // An off-season favorite must stay visible and removable, not render blank.
      const result = restrictToSelectableTeams(roster, selectable, ["NCAA-TINY"]);
      expect(result.map((t) => t.uniqueId)).toEqual(["NHL-BOS", "NHL-VGK", "NCAA-TINY"]);
    });

    it("keeps both Olympic sport ids of a stored selection", () => {
      const olympicRoster = [
        olympicTeam("OLYMPICS-HOCKEY-MEN-FRA", "France", "OLYMPICS-MEN"),
        olympicTeam("OLYMPICS-BASKETBALL-MEN-FRA", "France", "OLYMPICS-MEN"),
        olympicTeam("NHL-BOS", "Boston Bruins", "NHL"),
      ];

      // Only the basketball twin is selectable, but a stored hockey id must not
      // make its sibling disappear from the selector.
      const result = restrictToSelectableTeams(
        olympicRoster,
        [olympicTeam("OLYMPICS-BASKETBALL-MEN-FRA", "France", "OLYMPICS-MEN")],
        ["OLYMPICS-HOCKEY-MEN-FRA"],
      );

      expect(result.map((t) => t.uniqueId)).toEqual([
        "OLYMPICS-HOCKEY-MEN-FRA",
        "OLYMPICS-BASKETBALL-MEN-FRA",
      ]);
    });

    it("ignores empty keep ids", () => {
      expect(restrictToSelectableTeams(roster, selectable, ["", ""]).map((t) => t.uniqueId)).toEqual([
        "NHL-BOS",
        "NHL-VGK",
      ]);
    });
  });
});

describe("fetchRecentFormGames", () => {
  it("returns nothing for a missing team without calling the API", async () => {
    const result = await fetchRecentFormGames("");

    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("bounds a past game on its own start and returns the payload", async () => {
    mockSuccessfulFetch();
    const before = "2026-03-20T18:00:00.000Z";

    const result = await fetchRecentFormGames("NHL-BOS", before, 5);

    expect(result).toEqual(FORM_PAYLOAD);
    const url = lastRequestedUrl();
    expect(url).toContain(`/games/team/NHL-BOS/form`);
    expect(url).toContain("limit=5");
    expect(url).toContain(`before=${encodeURIComponent(before)}`);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("omits the bound for an upcoming game", async () => {
    mockSuccessfulFetch();

    await fetchRecentFormGames("NHL-BOS", undefined, 5);

    const url = lastRequestedUrl();
    expect(url).not.toContain("before=");
    expect(url).toContain("limit=5");
  });

  it("treats an unparsable bound as no bound", async () => {
    mockSuccessfulFetch();

    await fetchRecentFormGames("NHL-BOS", "not-a-date", 5);

    expect(lastRequestedUrl()).not.toContain("before=");
  });

  it("serves a past game from cache on the second call", async () => {
    mockSuccessfulFetch();
    const before = "2026-03-20T18:00:00.000Z";

    await fetchRecentFormGames("NHL-BOS", before, 5);
    const second = await fetchRecentFormGames("NHL-BOS", before, 5);

    expect(second).toEqual(FORM_PAYLOAD);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('serves an upcoming game from cache without a "now" bound defeating it', async () => {
    mockSuccessfulFetch();

    // Two calls with no bound, as two modal opens of the same upcoming game.
    await fetchRecentFormGames("NHL-BOS", undefined, 5);
    const second = await fetchRecentFormGames("NHL-BOS", undefined, 5);

    expect(second).toEqual(FORM_PAYLOAD);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("keeps a separate entry per team, per limit and per bound", async () => {
    mockSuccessfulFetch();
    const before = "2026-03-20T18:00:00.000Z";

    await fetchRecentFormGames("NHL-BOS", before, 5);
    await fetchRecentFormGames("NHL-NYR", before, 5); // other team
    await fetchRecentFormGames("NHL-BOS", before, 3); // other limit
    await fetchRecentFormGames("NHL-BOS", "2026-03-10T18:00:00.000Z", 5); // other bound
    await fetchRecentFormGames("NHL-BOS", undefined, 5); // no bound

    expect(mockFetch).toHaveBeenCalledTimes(5);
  });

  it("never caches an empty row so a team is not stuck blank", async () => {
    mockSuccessfulFetch([]);

    const first = await fetchRecentFormGames("NHL-BOS", undefined, 5);
    const second = await fetchRecentFormGames("NHL-BOS", undefined, 5);

    expect(first).toEqual([]);
    expect(second).toEqual([]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
