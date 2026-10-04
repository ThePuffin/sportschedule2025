import * as React from "react";
import { Image, Linking, TouchableOpacity } from "react-native";
import renderer from "react-test-renderer";

import GameModal from "../GameModal";
import { fetchRecentFormGames } from "../../utils/fetchData";
import { GameOutcome } from "../../utils/date";

import { GameFormatted } from "../../utils/types";

// GameModal → utils/utils.tsx → utils/firebaseConfig.ts imports AsyncStorage,
// which needs its official jest mock (see the async-storage jest docs).
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// utils/utils.tsx pulls in firebase (ESM not transformed by jest) through
// firebaseConfig and syncService; both are stubbed like in syncService.test.ts.
jest.mock("../../utils/firebaseConfig", () => ({
  auth: { currentUser: null },
  db: { mockDb: true },
}));

jest.mock("../../utils/syncService", () => ({
  syncToFirestore: jest.fn(),
}));

// @rneui/themed ships untranspiled ESM; GameModal only uses its Icon export,
// which is irrelevant to the logo rendering asserted below.
jest.mock("@rneui/themed", () => ({
  Icon: () => null,
}));

// The recent-form row renders bare Ionicons glyphs; stubbed so the suite does not
// depend on the bundled font being loaded in the test environment.
jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

// The recent-form row calls the team-results endpoint on open; stubbed here so
// the component tests never hit the network.
jest.mock("../../utils/fetchData", () => ({
  fetchLiveScores: jest.fn().mockResolvedValue([]),
  fetchRecentFormGames: jest.fn().mockResolvedValue([]),
}));

/**
 * Color scheme returned by the mocked `useColorScheme` hook below.
 * Must start with `mock` so jest allows referencing it inside `jest.mock`.
 */
let mockColorScheme: "light" | "dark" = "light";

// `react-native` exposes `useColorScheme` as a getter re-exporting this module's
// default export, so mocking the source module is enough (mocking the whole
// `react-native` index instead eagerly loads every native TurboModule).
jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: () => mockColorScheme,
}));

/** The bundled placeholder used for teams without a logo. */
const defaultLogoAsset = require("../../assets/images/default_logo.png");

/**
 * Overrides the language reported by `navigator`, which is where the app reads
 * the reader's locale from. The real value is kept so it can be restored after
 * each test instead of leaking a mutated locale into the other suites.
 */
const realDeviceLanguage = navigator.language;
const setDeviceLanguage = (language: string) => {
  Object.defineProperty(navigator, "language", {
    value: language,
    configurable: true,
  });
};
const restoreDeviceLanguage = () => {
  Object.defineProperty(navigator, "language", {
    value: realDeviceLanguage,
    configurable: true,
  });
};

const buildGame = (overrides: Partial<GameFormatted> = {}): GameFormatted => ({
  uniqueId: "NHL-1",
  awayTeamId: "away-id",
  awayTeam: "Away team",
  awayTeamShort: "AWY",
  awayTeamLogo: "",
  awayTeamLogoDark: "",
  awayTeamScore: null,
  homeTeamId: "home-id",
  homeTeam: "Home team",
  homeTeamShort: "HOM",
  homeTeamScore: null,
  homeTeamLogo: "",
  homeTeamLogoDark: "",
  arenaName: "Arena",
  placeName: "City",
  gameDate: "2025-01-01",
  teamSelectedId: "",
  // Far in the future so the live-score effect skips its network call.
  startTimeUTC: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
  show: true,
  selectedTeam: false,
  league: "NHL",
  urlLive: "https://example.com/live",
  color: "#000000",
  backgroundColor: "#ffffff",
  awayTeamColor: "#000000",
  awayTeamBackgroundColor: "#ffffff",
  homeTeamColor: "#000000",
  homeTeamBackgroundColor: "#ffffff",
  gameStatus: "SCHEDULED",
  ...overrides,
});

const renderModal = (data: GameFormatted): renderer.ReactTestRenderer => {
  let tree: renderer.ReactTestRenderer | undefined;
  renderer.act(() => {
    tree = renderer.create(
      <GameModal
        visible
        onClose={() => {}}
        data={data}
        gradientStyle={{}}
        favoriteTeams={[]}
      />,
    );
  });
  return tree as renderer.ReactTestRenderer;
};

/** Sources of the away then home team logo images, in render order. */
const logoSources = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAllByType(Image).map((node) => node.props.source);

/**
 * Default for the logo / Wikipedia suites: the results request never settles, so
 * its `setState` never fires after the synchronous `act()` those tests use (which
 * would warn "update not wrapped in act(...)"). The recent-form suite overrides
 * this with its own resolvable mock.
 */
beforeEach(() => {
  (fetchRecentFormGames as jest.Mock).mockImplementation(
    () => new Promise(() => {}),
  );
});

describe("GameModal team logos", () => {
  beforeEach(() => {
    mockColorScheme = "light";
  });

  it("renders the bundled default logo when both teams have no logo", () => {
    const sources = logoSources(renderModal(buildGame()));

    expect(sources).toHaveLength(2);
    sources.forEach((source) => {
      expect(source).toBe(defaultLogoAsset);
    });
  });

  it("never passes a non-string uri to Image (regression: require() asset used as uri)", () => {
    const sources = logoSources(
      renderModal(buildGame({ homeTeamLogoDark: "x", awayTeamLogoDark: "y" })),
    );

    sources.forEach((source) => {
      if (source && typeof source === "object" && "uri" in source) {
        expect(typeof source.uri).toBe("string");
      }
    });
  });

  it("keeps the remote logo when the team has one", () => {
    const sources = logoSources(
      renderModal(
        buildGame({
          awayTeamLogo: "https://cdn.example.com/away.png",
          homeTeamLogo: "https://cdn.example.com/home.png",
        }),
      ),
    );

    expect(sources).toEqual([
      { uri: "https://cdn.example.com/away.png" },
      { uri: "https://cdn.example.com/home.png" },
    ]);
  });

  it("uses the dark logo variant in dark mode", () => {
    mockColorScheme = "dark";

    const sources = logoSources(
      renderModal(
        buildGame({
          awayTeamLogo: "https://cdn.example.com/away.png",
          awayTeamLogoDark: "https://cdn.example.com/away-dark.png",
          homeTeamLogo: "https://cdn.example.com/home.png",
          homeTeamLogoDark: "https://cdn.example.com/home-dark.png",
        }),
      ),
    );

    expect(sources).toEqual([
      { uri: "https://cdn.example.com/away-dark.png" },
      { uri: "https://cdn.example.com/home-dark.png" },
    ]);
  });

  it("falls back to the default asset in dark mode when no dark logo exists", () => {
    mockColorScheme = "dark";

    const sources = logoSources(
      renderModal(buildGame({ homeTeamLogoDark: "", awayTeamLogoDark: "" })),
    );

    expect(sources).toHaveLength(2);
    sources.forEach((source) => {
      expect(source).toBe(defaultLogoAsset);
    });
  });

  it("falls back to the light logo in dark mode when only the light logo exists", () => {
    mockColorScheme = "dark";

    const sources = logoSources(
      renderModal(
        buildGame({
          awayTeamLogo: "https://cdn.example.com/away.png",
          homeTeamLogo: "https://cdn.example.com/home.png",
        }),
      ),
    );

    expect(sources).toEqual([
      { uri: "https://cdn.example.com/away.png" },
      { uri: "https://cdn.example.com/home.png" },
    ]);
  });
});

describe("GameModal Wikipedia links", () => {
  let openURLSpy: jest.SpyInstance;

  beforeEach(() => {
    mockColorScheme = "light";
    openURLSpy = jest
      .spyOn(Linking, "openURL")
      .mockResolvedValue(true as never);
  });

  afterEach(() => {
    openURLSpy.mockRestore();
    restoreDeviceLanguage();
  });

  /**
   * The two team logos are the only touchables wrapping an `<Image>`; the star
   * and close buttons are plain icons, so this targets exactly the away and home
   * logo links.
   */
  const logoTouchables = (tree: renderer.ReactTestRenderer) =>
    tree.root
      .findAllByType(TouchableOpacity)
      .filter((node) => node.findAllByType(Image).length > 0);

  it("wraps both team logos in a touchable", () => {
    const touchables = logoTouchables(renderModal(buildGame()));

    expect(touchables).toHaveLength(2);
  });

  it("opens the away team article, with spaces replaced by underscores", () => {
    setDeviceLanguage("en-US");
    const tree = renderModal(buildGame({ awayTeam: "Seattle Sounders FC" }));

    renderer.act(() => {
      logoTouchables(tree)[0].props.onPress();
    });

    expect(openURLSpy).toHaveBeenCalledWith(
      "https://en.wikipedia.org/wiki/Seattle_Sounders_FC",
    );
  });

  it("opens the home team article", () => {
    setDeviceLanguage("en-US");
    const tree = renderModal(buildGame({ homeTeam: "Inter Miami CF" }));

    renderer.act(() => {
      logoTouchables(tree)[1].props.onPress();
    });

    expect(openURLSpy).toHaveBeenCalledWith(
      "https://en.wikipedia.org/wiki/Inter_Miami_CF",
    );
  });

  it("uses the Wikipedia edition matching the reader language", () => {
    setDeviceLanguage("fr-CA");
    const tree = renderModal(buildGame({ awayTeam: "Seattle Sounders FC" }));

    renderer.act(() => {
      logoTouchables(tree)[0].props.onPress();
    });

    // `fr-CA` has no dedicated edition: the primary subtag `fr` is used.
    expect(openURLSpy).toHaveBeenCalledWith(
      "https://fr.wikipedia.org/wiki/Seattle_Sounders_FC",
    );
  });

  it("covers every language the app is translated into", () => {
    // All 11 translated languages have a Wikipedia edition, so none falls back.
    const languages = [
      "en",
      "fr",
      "de",
      "es",
      "it",
      "ja",
      "ko",
      "nl",
      "pt",
      "ru",
      "zh",
    ];

    languages.forEach((language) => {
      setDeviceLanguage(language);
      const tree = renderModal(buildGame({ awayTeam: "Seattle Sounders FC" }));
      openURLSpy.mockClear();

      renderer.act(() => {
        logoTouchables(tree)[0].props.onPress();
      });

      expect(openURLSpy).toHaveBeenCalledWith(
        `https://${language}.wikipedia.org/wiki/Seattle_Sounders_FC`,
      );
    });
  });

  it("falls back to English for a language the app is not translated into", () => {
    setDeviceLanguage("sv-SE");
    const tree = renderModal(buildGame({ awayTeam: "Seattle Sounders FC" }));

    renderer.act(() => {
      logoTouchables(tree)[0].props.onPress();
    });

    expect(openURLSpy).toHaveBeenCalledWith(
      "https://en.wikipedia.org/wiki/Seattle_Sounders_FC",
    );
  });

  it("escapes characters that are invalid in a URL path", () => {
    setDeviceLanguage("en-US");
    const tree = renderModal(buildGame({ awayTeam: "St. Louis City SC" }));

    renderer.act(() => {
      logoTouchables(tree)[0].props.onPress();
    });

    expect(openURLSpy).toHaveBeenCalledWith(
      "https://en.wikipedia.org/wiki/St._Louis_City_SC",
    );
  });

  it("never throws when the device cannot open the URL", async () => {
    setDeviceLanguage("en-US");
    openURLSpy.mockRejectedValueOnce(new Error("no browser"));
    const warnSpy = jest.spyOn(console, "warn").mockImplementation();
    const tree = renderModal(buildGame());

    await renderer.act(async () => {
      logoTouchables(tree)[0].props.onPress();
    });

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("disables the link when the team name is missing", () => {
    const touchables = logoTouchables(
      renderModal(buildGame({ awayTeam: "", homeTeam: "" })),
    );

    touchables.forEach((node) => {
      expect(node.props.disabled).toBe(true);
    });
  });
});

/** Builds one finished past game for the results payload. */
const buildResult = (overrides: Partial<GameFormatted> = {}): GameFormatted =>
  buildGame({
    league: "NHL",
    gameStatus: "STATUS_FINAL",
    // Far in the past so `getGamesStatus` reports it as finished.
    startTimeUTC: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  });

/**
 * The API returns a flat array for `GET /games/team/:id/form`; the helper below
 * keeps the test payloads readable by wrapping them when needed.
 */
const resultsFor = (games: GameFormatted[]) => games;

/** A finished game N days ago between `teamId` and a neutral opponent. */
const pastGame = (
  uniqueId: string,
  teamId: string,
  {
    teamScore,
    opponentScore,
    daysAgo = 5,
    isHome = true,
  }: {
    teamScore: number;
    opponentScore: number;
    daysAgo?: number;
    isHome?: boolean;
  },
): GameFormatted =>
  buildResult({
    uniqueId,
    homeTeamId: isHome ? teamId : "other",
    awayTeamId: isHome ? "other" : teamId,
    homeTeamScore: isHome ? teamScore : opponentScore,
    awayTeamScore: isHome ? opponentScore : teamScore,
    startTimeUTC: new Date(Date.now() - daysAgo * 864e5).toISOString(),
  });

const mockedFetchResults = fetchRecentFormGames as jest.Mock;

/**
 * Every tree rendered through the helpers below, unmounted after each test.
 * The form skeleton runs a looping `Animated` value; leaving the tree mounted
 * lets its timers fire after the test and produce "update not wrapped in act"
 * warnings.
 */
const renderedTrees: renderer.ReactTestRenderer[] = [];

const trackTree = (tree: renderer.ReactTestRenderer) => {
  renderedTrees.push(tree);
  return tree;
};

/** Renders the modal and lets the form effect settle. */
const renderModalWithForm = async (game: GameFormatted) => {
  let tree: renderer.ReactTestRenderer | undefined;
  await renderer.act(async () => {
    tree = renderer.create(
      <GameModal
        visible
        onClose={() => {}}
        data={game}
        gradientStyle={{}}
        favoriteTeams={[]}
      />,
    );
  });
  return trackTree(tree as renderer.ReactTestRenderer);
};

/**
 * Outcome of every entry in the form row, in render order (the away row comes
 * first). `findAll` also matches the composite element and its host instance,
 * which both carry the same props, so only host instances are kept to avoid
 * counting every entry twice.
 *
 * The row now draws bare icons instead of circles, so the only thing left to
 * assert is each entry's accessibility label. Those labels are spelled out for
 * screen readers ("Win" / "Loss" / "Draw"); they are mapped back to the compact
 * `W` / `L` / `D` form used throughout the suite.
 */
const FORM_LABEL_TO_OUTCOME: Record<string, GameOutcome> = {
  Win: "W",
  Loss: "L",
  Draw: "D",
};

const formLabels = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findAll(
      (node) =>
        typeof node.type === "string" &&
        String(node.props.testID ?? "").startsWith("form-dot-"),
    )
    .map((node) => FORM_LABEL_TO_OUTCOME[node.props.accessibilityLabel]);

describe("GameModal recent form (last 5 results)", () => {
  beforeEach(() => {
    mockedFetchResults.mockResolvedValue([]);
    // The loading skeleton animates a looping `Animated` value through timers.
    // Freezing them keeps those updates from firing between `act()` blocks,
    // which would warn "update not wrapped in act(...)".
    jest.useFakeTimers();
  });

  afterEach(() => {
    mockedFetchResults.mockReset();
    jest.useRealTimers();
    // Stop the looping form-skeleton animations.
    while (renderedTrees.length) {
      renderedTrees.pop()?.unmount();
    }
  });

  it("renders one dot per finished game, oldest first", async () => {
    // Payload order is arbitrary: the row must show them oldest -> newest.
    mockedFetchResults.mockImplementation(async (teamId: string) => {
      if (teamId !== "home-id") return {};
      return resultsFor([
        pastGame("h3", "home-id", {
          teamScore: 1,
          opponentScore: 3,
          daysAgo: 1,
        }),
        pastGame("h1", "home-id", {
          teamScore: 5,
          opponentScore: 0,
          daysAgo: 5,
        }),
        pastGame("h2", "home-id", {
          teamScore: 2,
          opponentScore: 2,
          daysAgo: 3,
        }),
      ]);
    });

    const tree = await renderModalWithForm(buildGame());

    // Home row (rendered after the empty away row) -> W, D, L oldest to newest.
    expect(formLabels(tree)).toEqual(["W", "D", "L"]);
  });

  it("renders nothing when the team has no stored history", async () => {
    const tree = await renderModalWithForm(buildGame());

    expect(formLabels(tree)).toHaveLength(0);
  });

  it("renders fewer dots than the limit when the team has fewer games", async () => {
    mockedFetchResults.mockImplementation(async (teamId: string) =>
      teamId === "away-id"
        ? resultsFor([
            pastGame("a1", "away-id", {
              teamScore: 1,
              opponentScore: 0,
              isHome: false,
            }),
          ])
        : {},
    );

    const tree = await renderModalWithForm(buildGame());

    expect(formLabels(tree)).toEqual(["W"]);
  });

  it("ignores a live game that already has a partial score", async () => {
    // The endpoint only filters on non-null scores, so a game in progress
    // (which already carries a partial score) would be counted as a loss.
    mockedFetchResults.mockImplementation(async (teamId: string) =>
      teamId === "home-id"
        ? resultsFor([
            buildResult({
              uniqueId: "live",
              homeTeamId: "home-id",
              awayTeamId: "other",
              homeTeamScore: 0,
              awayTeamScore: 2,
              gameStatus: "STATUS_IN_PROGRESS",
              // Started now, so it is genuinely running right now.
              startTimeUTC: new Date().toISOString(),
            }),
          ])
        : {},
    );

    const tree = await renderModalWithForm(buildGame());

    expect(formLabels(tree)).toHaveLength(0);
  });

  it("ignores a game stuck on IN_PROGRESS long after its duration", async () => {
    // `getGamesStatus` reports FINAL once the expected duration has elapsed;
    // the raw status must win so a stalled game is not counted.
    mockedFetchResults.mockImplementation(async (teamId: string) =>
      teamId === "home-id"
        ? resultsFor([
            buildResult({
              uniqueId: "stalled",
              homeTeamId: "home-id",
              awayTeamId: "other",
              homeTeamScore: 0,
              awayTeamScore: 2,
              gameStatus: "STATUS_IN_PROGRESS",
              startTimeUTC: new Date(Date.now() - 5 * 864e5).toISOString(),
            }),
          ])
        : {},
    );

    const tree = await renderModalWithForm(buildGame());

    expect(formLabels(tree)).toHaveLength(0);
  });

  it("reads the outcome from the team point of view when playing away", async () => {
    // Our team is the away side and loses 1-3 -> a loss, not a win.
    mockedFetchResults.mockImplementation(async (teamId: string) =>
      teamId === "away-id"
        ? resultsFor([
            pastGame("a1", "away-id", {
              teamScore: 1,
              opponentScore: 3,
              isHome: false,
            }),
          ])
        : {},
    );

    const tree = await renderModalWithForm(buildGame());

    expect(formLabels(tree)).toEqual(["L"]);
  });

  it("counts an overtime loss as a draw", async () => {
    // NHL: the losing side goes to overtime -> otLosses, shown as a draw.
    mockedFetchResults.mockImplementation(async (teamId: string) =>
      teamId === "home-id"
        ? resultsFor([
            buildResult({
              uniqueId: "otl",
              homeTeamId: "home-id",
              awayTeamId: "other",
              homeTeamScore: 2,
              awayTeamScore: 3,
              gamePeriod: 4, // decided in overtime
            }),
          ])
        : {},
    );

    const tree = await renderModalWithForm(buildGame());

    expect(formLabels(tree)).toEqual(["D"]);
  });

  it("detects an overtime loss from the status when gamePeriod is missing", async () => {
    mockedFetchResults.mockImplementation(async (teamId: string) =>
      teamId === "home-id"
        ? resultsFor([
            buildResult({
              uniqueId: "otl-status",
              homeTeamId: "home-id",
              awayTeamId: "other",
              homeTeamScore: 1,
              awayTeamScore: 2,
              gameStatus: "STATUS_FINAL_OT",
            }),
          ])
        : {},
    );

    const tree = await renderModalWithForm(buildGame());

    expect(formLabels(tree)).toEqual(["D"]);
  });

  it("keeps a regulation loss as a loss in a hockey league", async () => {
    mockedFetchResults.mockImplementation(async (teamId: string) =>
      teamId === "home-id"
        ? resultsFor([
            buildResult({
              uniqueId: "regulation",
              homeTeamId: "home-id",
              awayTeamId: "other",
              homeTeamScore: 1,
              awayTeamScore: 4,
              gamePeriod: 3, // decided in regulation
            }),
          ])
        : {},
    );

    const tree = await renderModalWithForm(buildGame());

    expect(formLabels(tree)).toEqual(["L"]);
  });

  it("never treats a period 4 game as overtime outside hockey", async () => {
    // Baseball/football games can reach a 4th period without any OT concept.
    mockedFetchResults.mockImplementation(async (teamId: string) =>
      teamId === "home-id"
        ? resultsFor([
            buildResult({
              uniqueId: "mlb",
              league: "MLB",
              homeTeamId: "home-id",
              awayTeamId: "other",
              homeTeamScore: 1,
              awayTeamScore: 2,
              gamePeriod: 5,
            }),
          ])
        : {},
    );

    const tree = await renderModalWithForm(buildGame());

    expect(formLabels(tree)).toEqual(["L"]);
  });

  it("keeps the home row when the away request fails", async () => {
    mockedFetchResults.mockImplementation(async (teamId: string) => {
      if (teamId === "away-id") throw new Error("network down");
      return resultsFor([
        pastGame("h1", "home-id", { teamScore: 5, opponentScore: 1 }),
      ]);
    });

    const tree = await renderModalWithForm(buildGame());

    expect(formLabels(tree)).toEqual(["W"]);
  });

  it("does not request anything when a team has no id", async () => {
    await renderModalWithForm(buildGame({ awayTeamId: "", homeTeamId: "" }));

    expect(mockedFetchResults).not.toHaveBeenCalled();
  });

  it("never counts the game being displayed", async () => {
    // The endpoint filters with `gameDate >= startDate`, so the displayed game
    // comes back with the rest and must be dropped from the row.
    mockedFetchResults.mockImplementation(async (teamId: string) =>
      teamId === "home-id"
        ? resultsFor([
            pastGame("shown", "home-id", {
              teamScore: 0,
              opponentScore: 4,
              daysAgo: 2,
            }),
            pastGame("older", "home-id", {
              teamScore: 5,
              opponentScore: 1,
              daysAgo: 6,
            }),
          ])
        : {},
    );

    const tree = await renderModalWithForm(
      // Same uniqueId as the 'shown' result above.
      buildGame({
        uniqueId: "shown",
        startTimeUTC: new Date(Date.now() - 2 * 864e5).toISOString(),
      }),
    );

    // Only the older win remains.
    expect(formLabels(tree)).toEqual(["W"]);
  });

  it("asks for the latest results when the displayed game is upcoming", async () => {
    await renderModalWithForm(
      buildGame({
        startTimeUTC: new Date(Date.now() + 10 * 864e5).toISOString(),
      }),
    );

    // No `before` at all: the bound would have to be "now", which carries
    // milliseconds and would change on every open, making the URL unique and
    // defeating the cache. Without it the backend returns the team's most recent
    // played games, which is exactly the wanted set. The row is still capped at 5.
    expect(mockedFetchResults).toHaveBeenCalledWith("away-id", undefined, 5);
    expect(mockedFetchResults).toHaveBeenCalledWith("home-id", undefined, 5);
  });

  it("asks for results up to that instant when the displayed game is past", async () => {
    const playedAt = new Date(Date.now() - 8 * 864e5).toISOString();

    await renderModalWithForm(buildGame({ startTimeUTC: playedAt }));

    expect(mockedFetchResults).toHaveBeenCalledWith("home-id", playedAt, 5);
  });

  describe("loading skeleton", () => {
    const skeletonDots = (tree: renderer.ReactTestRenderer) =>
      tree.root.findAll(
        (node) =>
          typeof node.type === "string" &&
          String(node.props.testID ?? "").startsWith("form-skeleton-dot-"),
      );

    it("shows gray placeholders while the request is pending, then the real dots", async () => {
      // Never resolves during the first render: the skeleton must be visible.
      mockedFetchResults.mockImplementation(() => new Promise(() => {}));

      let tree: renderer.ReactTestRenderer | undefined;
      await renderer.act(async () => {
        tree = renderer.create(
          <GameModal
            visible
            onClose={() => {}}
            data={buildGame()}
            gradientStyle={{}}
            favoriteTeams={[]}
          />,
        );
      });

      // One skeleton per team (away + home), 5 dots each.
      expect(skeletonDots(tree as renderer.ReactTestRenderer)).toHaveLength(10);
      // No real dots yet.
      expect(formLabels(tree as renderer.ReactTestRenderer)).toHaveLength(0);

      // Stop the looping animation before the test ends, otherwise its timers
      // keep updating the tree outside `act()` and fail the run.
      (tree as renderer.ReactTestRenderer).unmount();

      // Let the request settle: the skeleton must give way to the real row.
      mockedFetchResults.mockResolvedValue([]);
      const settled = await renderModalWithForm(buildGame());

      expect(skeletonDots(settled)).toHaveLength(0);
    });

    it("never shows a loader for a team without an id", async () => {
      mockedFetchResults.mockImplementation(() => new Promise(() => {}));

      let tree: renderer.ReactTestRenderer | undefined;
      await renderer.act(async () => {
        tree = renderer.create(
          <GameModal
            visible
            onClose={() => {}}
            data={buildGame({ awayTeamId: "", homeTeamId: "" })}
            gradientStyle={{}}
            favoriteTeams={[]}
          />,
        );
      });

      expect(skeletonDots(tree as renderer.ReactTestRenderer)).toHaveLength(0);
    });

    it("drops the skeleton once the teams answer, even with no history", async () => {
      mockedFetchResults.mockResolvedValue([]);

      const tree = await renderModalWithForm(buildGame());

      // No endless loader for a team with no stored games.
      expect(skeletonDots(tree)).toHaveLength(0);
      expect(formLabels(tree)).toHaveLength(0);
    });
  });
});
