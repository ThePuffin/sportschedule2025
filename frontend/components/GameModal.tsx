import { ThemedText } from "@/components/ThemedText";
import { maxFavoritesNumber } from "@/constants/Constants";
import { GameStatus, League, leagueMapping } from "@/constants/enum";
import {
  getGamesStatus,
  getRecentForm,
  GameOutcome,
  isGameAwaitingFinalization,
  RECENT_FORM_LENGTH,
} from "@/utils/date";
import { fetchLiveScores, fetchRecentFormGames } from "@/utils/fetchData";
import { GameFormatted } from "@/utils/types";
import {
  addFavoriteTeam,
  generateICSFile,
  getTeamWikipediaUrl,
  translateWord,
} from "@/utils/utils";
import { Icon } from "@rneui/themed";
import { Ionicons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";

/**
 * Bundled placeholder shown when a team has no logo (same asset as the cards).
 * It is a `require()` asset id, so it must be used directly as `source` and
 * never through `{ uri: ... }`.
 */
/** Delay before each placeholder dot starts fading in, and its fade duration. */
const DOT_DELAY_MS = 220;
const DOT_FADE_MS = 260;
/**
 * One full cycle of the loader: the last dot finishes fading at
 * `(5 - 1) * 220 + 260 = 1140ms`, so the cycle is padded to leave a brief pause
 * before the sequence restarts and reads as a loop rather than a flicker.
 */
const LOADER_CYCLE_MS = 1400;

const defaultLogo = require("../assets/images/default_logo.png");

/**
 * Color of the form dots: the same as the modal's own text, so the row reads as
 * a neutral indicator instead of borrowing a team color. Mirrors the
 * `lightColor` / `darkColor` the modal passes to its `ThemedText` labels.
 */
const DOT_COLORS = { light: "#0f172a", dark: "#ffffff" };

/**
 * Bare Ionicons glyph per form outcome — the icons replace the former
 * filled/hollow circles. They are drawn **without any background**, in the
 * modal's text color, so the row stays a neutral indicator that never clashes
 * with the card or borrows the team color.
 *
 * `D` keeps a circle-ish glyph (`contrast`, half-filled) because "nothing
 * happened" has no glyph of its own and reads better as a half circle than as
 * a plain dash.
 */
const FORM_OUTCOME_ICONS: Record<
  GameOutcome,
  "checkmark" | "close" | "contrast"
> = {
  W: "checkmark",
  L: "close",
  D: "contrast",
};

/**
 * Screen-reader label per outcome. Plain English on purpose: `translateWord()`
 * has no `win` / `loss` / `draw` key, and the icons are now self-explanatory to
 * a sighted user, so the label is only a fallback for VoiceOver/TalkBack.
 */
const FORM_OUTCOME_LABELS: Record<GameOutcome, string> = {
  W: "Win",
  L: "Loss",
  D: "Draw",
};

interface GameModalProps {
  visible: boolean;
  onClose: () => void;
  data: GameFormatted;
  gradientStyle: any;
  favoriteTeams: string[];
  showScores?: boolean;
  /**
   * When provided (favorites modal), displays a "remove from favorites" button
   * next to the `.ics` / "locate arena" actions and calls it on press.
   */
  onRemoveFromFavorites?: (game: GameFormatted) => void;
}

export default function GameModal({
  visible,
  onClose,
  data,
  gradientStyle,
  favoriteTeams,
  showScores = true,
  onRemoveFromFavorites,
}: Readonly<GameModalProps>) {
  const [liveGame, setLiveGame] = useState<GameFormatted | null>(null);
  // Last results of each team, oldest → newest, for the form dots row.
  const [awayForm, setAwayForm] = useState<GameOutcome[]>([]);
  const [homeForm, setHomeForm] = useState<GameOutcome[]>([]);
  // True while the results request is in flight: gray placeholder dots are shown
  // instead of the real row, so nothing "pops" into place once the data lands.
  const [formLoading, setFormLoading] = useState(false);

  /**
   * The instant the form is computed up to, passed to the API as `before` so the
   * returned games are the ones played before the displayed game:
   * - game in the future → `undefined`, i.e. the team's five most recent
   *   results. A "now" bound would carry milliseconds and change on every
   *   render, making the request URL (and the cache key built from it) unique
   *   on each open, so no result could ever be reused;
   * - game in the past → its own start, i.e. the five results played just
   *   before it.
   *
   * The displayed game can therefore never come back in the payload, so
   * `getRecentForm` does not need to exclude it by id.
   */
  const formBefore = useMemo(() => {
    const start = new Date(data.startTimeUTC);
    const isUpcoming =
      Number.isNaN(start.getTime()) || start.getTime() > Date.now();
    return isUpcoming ? undefined : start.toISOString();
  }, [data.startTimeUTC]);

  /**
   * Loads the recent results of one team and turns them into a form row.
   * A failure is swallowed into an empty row: a team with no stored history (or
   * a failing request) simply shows no dots instead of breaking the modal.
   */
  const loadTeamForm = useCallback(
    async (teamId: string | undefined) => {
      if (!teamId) return [] as GameOutcome[];
      try {
        const games = await fetchRecentFormGames(
          teamId,
          formBefore,
          RECENT_FORM_LENGTH,
        );
        return getRecentForm(games, teamId, RECENT_FORM_LENGTH, data.uniqueId);
      } catch {
        return [] as GameOutcome[];
      }
    },
    [formBefore, data.uniqueId],
  );

  useEffect(() => {
    if (visible) {
      const fetchLiveGameData = async () => {
        const gameTime = new Date(data.startTimeUTC);
        const now = new Date();
        const hoursDiff =
          (now.getTime() - gameTime.getTime()) / (1000 * 60 * 60);

        if (
          hoursDiff > -0.25 &&
          hoursDiff < 5 &&
          data.gameStatus !== "FINAL" &&
          data.gameStatus !== "FINISHED"
        ) {
          const liveScores = await fetchLiveScores([data.uniqueId]);
          if (liveScores && liveScores.length > 0) {
            setLiveGame(liveScores[0]);
          }
        }
      };

      fetchLiveGameData();
    } else {
      setLiveGame(null);
    }
  }, [visible, data.uniqueId, data.startTimeUTC, data.gameStatus]);

  // Recent form of both teams. Reset as soon as the modal closes (or the match
  // changes) so a previous row is never shown against another game, and each
  // team is loaded independently so one failure cannot hide the other row.
  useEffect(() => {
    if (!visible) {
      setAwayForm([]);
      setHomeForm([]);
      setFormLoading(false);
      return;
    }

    let cancelled = false;
    // Gray placeholders stay until BOTH rows are settled, so the skeleton never
    // flashes for a team that already answered.
    setFormLoading(true);
    const load = async () => {
      const [away, home] = await Promise.all([
        loadTeamForm(data.awayTeamId),
        loadTeamForm(data.homeTeamId),
      ]);
      // The modal may have been closed (or another game opened) meanwhile.
      if (cancelled) return;
      setAwayForm(away);
      setHomeForm(home);
      setFormLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [visible, data.awayTeamId, data.homeTeamId, loadTeamForm, formBefore]);

  const displayData = liveGame || data;
  const {
    startTimeUTC,
    homeTeamLogo,
    awayTeamLogo,
    homeTeamLogoDark,
    awayTeamLogoDark,
    homeTeam,
    awayTeam,
    homeTeamId,
    awayTeamId,
    arenaName,
    placeName,
    homeTeamScore,
    awayTeamScore,
    homeTeamRecord,
    awayTeamRecord,
    urlLive,
    league,
    gameStatus,
    gameClock,
    gamePeriod,
    dataChangedAt,
  } = displayData;

  const hasScore = homeTeamScore != null && awayTeamScore != null;
  const status = getGamesStatus(displayData);
  const isToday =
    new Date().toDateString() === new Date(startTimeUTC).toDateString();
  const isLive =
    (status as GameStatus) !== GameStatus.DELAYED &&
    ((status as GameStatus) === GameStatus.IN_PROGRESS ||
      (!!gameStatus &&
        [
          "Top",
          "Bot",
          "Mid",
          "End",
          "1st",
          "2nd",
          "3rd",
          "4th",
          "OT",
          "Half",
          "'",
          "In SO",
        ].some((s) => gameStatus.includes(s)) &&
        !gameStatus.toUpperCase().includes("FINAL") &&
        !gameStatus.toUpperCase().includes("ENDED")) ||
      (hasScore &&
        isToday &&
        (status as GameStatus) !== GameStatus.FINISHED &&
        (status as GameStatus) !== GameStatus.FINAL));
  const gameStatusAlreadyIncludesClock = (status?: string, clock?: string) => {
    if (!status || !clock) return false;
    const normalizedStatus = status.toLowerCase();
    const normalizedClock = clock.toLowerCase();
    const variants = [normalizedClock];
    if (normalizedClock.startsWith("00:")) {
      variants.push(normalizedClock.replace(/^00:/, ""));
    }
    if (normalizedClock.startsWith("0:")) {
      variants.push(normalizedClock.replace(/^0:/, ""));
    }
    return variants.some((variant) => normalizedStatus.includes(variant));
  };

  const livePeriodText =
    gameStatus || (typeof gamePeriod === "number" ? `P${gamePeriod}` : "");
  const liveTimeText =
    gameClock && livePeriodText
      ? gameStatusAlreadyIncludesClock(livePeriodText, gameClock)
        ? livePeriodText
        : `${gameClock} - ${livePeriodText}`
      : gameClock || livePeriodText || translateWord("inProgress");
  const showLiveScoreNumbers = hasScore;
  const serviceReportsNotTerminated =
    isLive ||
    (!!gameStatus &&
      !gameStatus.toUpperCase().includes("FINAL") &&
      gameStatus.toUpperCase() !== "FINISHED" &&
      gameStatus.toUpperCase() !== "ENDED");
  // "Finalisation" (the provider never sent a score) is only shown once the
  // expected end of the match has passed AND the feed tells us nothing more:
  // no time left on the clock, or a feed frozen since `dataChangedAt`.
  const showFinalization =
    !hasScore &&
    serviceReportsNotTerminated &&
    isGameAwaitingFinalization({
      startTimeUTC,
      league,
      gameClock,
      dataChangedAt,
    });

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  const stadiumSearch =
    (arenaName || "").replace(/\s+/g, "+") +
    "," +
    (placeName || "").replace(/\s+/g, "+");
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const iconColor = isDark ? "white" : "black";
  const buttonBackgroundColor = isDark
    ? "rgba(255, 255, 255, 0.2)"
    : "rgba(0, 0, 0, 0.1)";

  // Missing or empty logo strings must resolve to the bundled `defaultLogo`
  // asset (a numeric `require()` id) when building the `<Image source>`.
  const displayHomeLogo =
    isDark && homeTeamLogoDark ? homeTeamLogoDark : homeTeamLogo;
  const displayAwayLogo =
    isDark && awayTeamLogoDark ? awayTeamLogoDark : awayTeamLogo;

  const getEspnStandingsUrl = (leagueKey: string) => {
    const baseUrl = "https://www.espn.com";

    const path =
      leagueMapping[leagueKey.toUpperCase() as keyof typeof leagueMapping];

    if (!path) return null;

    return `${baseUrl}/${path}`;
  };

  const standingUrl =
    league === League.PWHL
      ? "https://www.thepwhl.com/stats/standings"
      : getEspnStandingsUrl(league);

  /**
   * Opens the team's Wikipedia article in the reader's language (falls back to
   * the English edition for a language Wikipedia does not publish, and does
   * nothing when the game carries no team name).
   */
  const openWikipediaTeam = async (teamName?: string | null) => {
    const url = getTeamWikipediaUrl(teamName);
    if (!url) return;

    try {
      await Linking.openURL(url);
    } catch {
      // The device may have no browser or the user may have cancelled: never
      // crash the modal for a convenience link.
      console.warn(`Could not open the Wikipedia page for "${teamName}".`);
    }
  };

  /**
   * Placeholder row shown while the results request is in flight: five neutral gray
   * dots that light up one after the other, then restart, so the row reads as a
   * loader instead of the real dots popping into place all at once.
   *
   * A single `Animated.Value` drives the whole sequence (cheaper than one per dot):
   * it sweeps 0 → 1 over `LOADER_CYCLE_MS`, each dot interpolating its own slice of
   * that sweep, offset by `index * DOT_DELAY_MS`. The loop restarts when the value
   * reaches 1, which is exactly the "all dots shown → start again" behavior.
   *
   * Stops (`stopAnimation`) when the modal closes so no timer keeps running.
   */
  function FormSkeleton({ isDark }: { isDark: boolean }) {
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const animation = Animated.loop(
        Animated.timing(progress, {
          toValue: 1,
          duration: LOADER_CYCLE_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      animation.start();
      return () => animation.stop();
    }, [progress]);

    const baseColor = isDark
      ? "rgba(148, 163, 184, 0.25)"
      : "rgba(100, 116, 139, 0.25)";

    return (
      <View style={styles.formRow} testID="form-skeleton">
        {Array.from({ length: RECENT_FORM_LENGTH }).map((_, index) => {
          const start = (index * DOT_DELAY_MS) / LOADER_CYCLE_MS;
          const end = (index * DOT_DELAY_MS + DOT_FADE_MS) / LOADER_CYCLE_MS;
          return (
            <Animated.View
              key={index}
              testID={`form-skeleton-dot-${index}`}
              style={[
                styles.formSkeletonPlaceholder,
                {
                  backgroundColor: baseColor,
                  opacity: progress.interpolate({
                    inputRange: [Math.min(start, 1), Math.min(end, 1)],
                    outputRange: [0.45, 1],
                    extrapolate: "clamp",
                  }),
                },
              ]}
            />
          );
        })}
      </View>
    );
  }

  /**
   * The "last 5 results" row: one bare icon per game, **oldest on the left,
   * most recent on the right**.
   *
   * - `W` — checkmark;
   * - `L` — cross;
   * - `D` — half-filled circle.
   *
   * The icons carry **no background and no border**: they only use the modal's
   * text color (`DOT_COLORS`) rather than the team color, so the row stays a
   * neutral indicator and never clashes with the card. Renders nothing at all
   * when the team has no stored history.
   */
  const renderFormRow = (form: GameOutcome[], teamId?: string) => {
    // While loading, the neutral animated placeholders take the row's place: the
    // layout is identical, so nothing shifts when the real icons land. A team with
    // no id has nothing to load, so it never shows a loader.
    if (formLoading && teamId) return <FormSkeleton isDark={isDark} />;
    if (!form || form.length === 0) return null;

    const color = isDark ? DOT_COLORS.dark : DOT_COLORS.light;

    return (
      <View style={styles.formRow}>
        {form.map((outcome, index) => (
          <View
            key={`${outcome}-${index}`}
            style={styles.formIconSlot}
            accessibilityRole="image"
            accessibilityLabel={FORM_OUTCOME_LABELS[outcome]}
            testID={`form-dot-${index}`}
          >
            <Ionicons
              name={FORM_OUTCOME_ICONS[outcome]}
              size={12}
              color={color}
            />
          </View>
        ))}
      </View>
    );
  };

  const renderStatusText = () => {
    if (isLive) {
      if (
        (!gameClock || gameClock === "00:00") &&
        gameStatus &&
        gameStatus !== "IN_PROGRESS"
      ) {
        return (
          <ThemedText
            style={[styles.dateText, { color: "#ef4444", fontWeight: "bold" }]}
          >
            {gameStatus}
          </ThemedText>
        );
      }

      return (
        <ThemedText
          style={[styles.dateText, { color: "#ef4444", fontWeight: "bold" }]}
        >
          {liveTimeText}
        </ThemedText>
      );
    }

    if (showFinalization) {
      return (
        <ThemedText
          lightColor="#475569"
          darkColor="#CBD5E1"
          style={styles.dateText}
        >
          {translateWord("final")}
        </ThemedText>
      );
    }

    if ((status as GameStatus) === GameStatus.DELAYED) {
      return (
        <ThemedText
          lightColor="#475569"
          darkColor="#CBD5E1"
          style={styles.dateText}
        >
          {translateWord("delayedGame")}
        </ThemedText>
      );
    }

    if (hasScore) {
      if ((status as GameStatus) === GameStatus.FINISHED) {
        return (
          <ThemedText
            lightColor="#475569"
            darkColor="#CBD5E1"
            style={styles.dateText}
          >
            {translateWord("score")}
          </ThemedText>
        );
      }

      const statusText =
        (status as GameStatus) === GameStatus.FINAL
          ? translateWord("final")
          : translateWord("ended");
      return (
        <ThemedText
          lightColor="#475569"
          darkColor="#CBD5E1"
          style={styles.dateText}
        >
          {statusText}
        </ThemedText>
      );
    }

    return (
      <ThemedText
        lightColor="#475569"
        darkColor="#CBD5E1"
        style={styles.dateText}
      >
        {startTimeUTC
          ? new Date(startTimeUTC).toLocaleDateString(undefined, dateOptions)
          : ""}
      </ThemedText>
    );
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.centeredView} onPress={onClose}>
        <Pressable
          style={[styles.modalView, gradientStyle]}
          onPress={(e) => e.stopPropagation()}
        >
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon
              name="close"
              type="font-awesome"
              size={20}
              color={iconColor}
            />
          </TouchableOpacity>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.teamsContainer}>
              <View style={styles.teamColumn}>
                {/* Away team logo: opens the team's Wikipedia article in the reader's language. */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={!awayTeam}
                  accessibilityRole="link"
                  accessibilityLabel={awayTeam}
                  onPress={() => openWikipediaTeam(awayTeam)}
                >
                  <Image
                    source={
                      displayAwayLogo ? { uri: displayAwayLogo } : defaultLogo
                    }
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <ThemedText
                  lightColor="#0f172a"
                  darkColor="#ffffff"
                  style={styles.modalTeamName}
                >
                  {awayTeam ? awayTeam.replace(/ (?=[^ ]*$)/, "\n") : ""}
                  {(favoriteTeams.includes(awayTeamId) ||
                    favoriteTeams.length < maxFavoritesNumber) && (
                    <Icon
                      onPress={() => addFavoriteTeam(favoriteTeams, awayTeamId)}
                      name={
                        favoriteTeams.includes(awayTeamId) ? "star" : "star-o"
                      }
                      type="font-awesome"
                      size={14}
                      color={
                        favoriteTeams.includes(awayTeamId)
                          ? "#FFD700"
                          : "#94a3b8"
                      }
                      style={{ marginLeft: 5 }}
                    />
                  )}
                </ThemedText>
                {awayTeamRecord && (
                  <ThemedText
                    lightColor="#475569"
                    darkColor="#94a3b8"
                    style={styles.recordText}
                  >
                    {awayTeamRecord}
                  </ThemedText>
                )}
                {renderFormRow(awayForm, awayTeamId)}
              </View>

              {showLiveScoreNumbers ? (
                <View style={styles.scoreContainer}>
                  <ThemedText
                    lightColor="#0f172a"
                    darkColor="#ffffff"
                    style={styles.scoreText}
                  >
                    {awayTeamScore}
                  </ThemedText>
                  <ThemedText
                    lightColor="#475569"
                    darkColor="#CBD5E1"
                    style={styles.scoreDivider}
                  >
                    -
                  </ThemedText>
                  <ThemedText
                    lightColor="#0f172a"
                    darkColor="#ffffff"
                    style={styles.scoreText}
                  >
                    {homeTeamScore}
                  </ThemedText>
                </View>
              ) : (
                <ThemedText
                  lightColor="#475569"
                  darkColor="#CBD5E1"
                  style={styles.modalVsText}
                >
                  @
                </ThemedText>
              )}

              <View style={styles.teamColumn}>
                {/* Home team logo: opens the team's Wikipedia article in the reader's language. */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={!homeTeam}
                  accessibilityRole="link"
                  accessibilityLabel={homeTeam}
                  onPress={() => openWikipediaTeam(homeTeam)}
                >
                  <Image
                    source={
                      displayHomeLogo ? { uri: displayHomeLogo } : defaultLogo
                    }
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <ThemedText
                  lightColor="#0f172a"
                  darkColor="#ffffff"
                  style={styles.modalTeamName}
                >
                  {homeTeam ? homeTeam.replace(/ (?=[^ ]*$)/, "\n") : ""}
                  {(favoriteTeams.includes(homeTeamId) ||
                    favoriteTeams.length < maxFavoritesNumber) && (
                    <Icon
                      onPress={() => addFavoriteTeam(favoriteTeams, homeTeamId)}
                      name={
                        favoriteTeams.includes(homeTeamId) ? "star" : "star-o"
                      }
                      type="font-awesome"
                      size={14}
                      color={
                        favoriteTeams.includes(homeTeamId)
                          ? "#FFD700"
                          : "#94a3b8"
                      }
                      style={{ marginLeft: 5 }}
                    />
                  )}
                </ThemedText>
                {homeTeamRecord && (
                  <ThemedText
                    lightColor="#475569"
                    darkColor="#94a3b8"
                    style={styles.recordText}
                  >
                    {homeTeamRecord}
                  </ThemedText>
                )}
                {renderFormRow(homeForm, homeTeamId)}
              </View>
            </View>
            {renderStatusText()}

            <View style={styles.actionsRow}>
              {isLive || hasScore ? (
                <>
                  <a
                    href={urlLive}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      textDecoration: "none",
                      display: "flex",
                      flex: 1,
                      justifyContent: "center",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <View
                      style={[
                        styles.actionButton,
                        {
                          backgroundColor: buttonBackgroundColor,
                          width: "100%",
                        },
                      ]}
                    >
                      <Icon
                        name="list-alt"
                        type="font-awesome"
                        size={20}
                        color={iconColor}
                        style={{ marginRight: 10 }}
                      />
                      <ThemedText
                        lightColor="#0f172a"
                        darkColor="#ffffff"
                        style={styles.actionButtonText}
                      >
                        {translateWord("gameDetails")}
                      </ThemedText>
                    </View>
                  </a>
                  {standingUrl && (
                    <a
                      href={standingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        textDecoration: "none",
                        display: "flex",
                        flex: 1,
                        justifyContent: "center",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <View
                        style={[
                          styles.actionButton,
                          {
                            backgroundColor: buttonBackgroundColor,
                            width: "100%",
                          },
                        ]}
                      >
                        <Icon
                          name="list-ol"
                          type="font-awesome"
                          size={20}
                          color={iconColor}
                          style={{ marginRight: 10 }}
                        />
                        <ThemedText
                          lightColor="#0f172a"
                          darkColor="#ffffff"
                          style={styles.actionButtonText}
                        >
                          {translateWord("standings")}
                        </ThemedText>
                      </View>
                    </a>
                  )}
                  {onRemoveFromFavorites && (
                    <View style={styles.buttonWrapper}>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          { backgroundColor: buttonBackgroundColor },
                        ]}
                        onPress={() => {
                          onRemoveFromFavorites(data);
                          onClose();
                        }}
                      >
                        <Icon
                          name="trash"
                          type="font-awesome"
                          size={18}
                          color={iconColor}
                          style={styles.buttonIcon}
                        />
                        <ThemedText style={styles.actionButtonText}>
                          {translateWord("removeFromFavorites")}
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <View style={styles.buttonWrapper}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: buttonBackgroundColor },
                      ]}
                      onPress={() => {
                        generateICSFile(data);
                        onClose();
                      }}
                    >
                      <Icon
                        name="calendar-plus-o"
                        type="font-awesome"
                        size={18}
                        color={iconColor}
                        style={styles.buttonIcon}
                      />
                      <ThemedText style={styles.actionButtonText}>
                        {translateWord("downloadICS")}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>

                  {(arenaName || onRemoveFromFavorites) && (
                    <View style={styles.buttonWrapper}>
                      {onRemoveFromFavorites ? (
                        // Favorites modal: the trash button replaces the
                        // "locate arena" action.
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            { backgroundColor: buttonBackgroundColor },
                          ]}
                          onPress={() => {
                            onRemoveFromFavorites(data);
                            onClose();
                          }}
                        >
                          <Icon
                            name="trash"
                            type="font-awesome"
                            size={18}
                            color={iconColor}
                            style={styles.buttonIcon}
                          />
                          <ThemedText style={styles.actionButtonText}>
                            {translateWord("removeFromFavorites")}
                          </ThemedText>
                        </TouchableOpacity>
                      ) : (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${stadiumSearch}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ textDecoration: "none" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <View
                            style={[
                              styles.actionButton,
                              { backgroundColor: buttonBackgroundColor },
                            ]}
                          >
                            <Icon
                              name="map-marker"
                              type="font-awesome"
                              size={18}
                              color={iconColor}
                              style={styles.buttonIcon}
                            />
                            <ThemedText style={styles.actionButtonText}>
                              {translateWord("localizeArena")}
                            </ThemedText>
                          </View>
                        </a>
                      )}
                    </View>
                  )}
                </>
              )}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: "90%",
    maxWidth: 500,
    // The card must never exceed the viewport: its content (two team columns,
    // the form rows, the status line and the actions) is scrollable below.
    maxHeight: "92%",
  },
  closeButton: {
    alignSelf: "flex-end",
    padding: 5,
  },
  modalScroll: {
    width: "100%",
  },
  modalContent: {
    alignItems: "center",
    width: "100%",
  },
  teamsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  teamColumn: {
    alignItems: "center",
    flex: 1,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 10,
  },
  modalTeamName: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  recordText: {
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
  },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    // Fixed height so the two rows can never stretch the modal further.
    height: 12,
    marginTop: 6,
  },
  formIconSlot: {
    // Fixed-size wrapper around each outcome icon: it gives every glyph the same
    // box (so a checkmark and a cross line up exactly) and owns the spacing.
    width: 12,
    height: 12,
    marginHorizontal: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  formSkeletonPlaceholder: {
    // Same box as `formIconSlot` so the loading row has the exact same layout as
    // the real icons — nothing shifts when they land. Not a circle anymore: a
    // faint rounded square is the neutral "unknown result" shape.
    width: 12,
    height: 12,
    marginHorizontal: 1.5,
    borderRadius: 3,
  },
  modalTeamFullName: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 5,
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 70,
  },
  modalVsText: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 70,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: "bold",
    marginHorizontal: 5,
    lineHeight: 32,
  },
  scoreDivider: {
    fontSize: 24,
    fontWeight: "bold",
  },
  actionsRow: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
    marginTop: 10,
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
  },
  buttonWrapper: {
    flex: 1,
    maxWidth: 200,
    minWidth: 120,
  },
  actionButton: {
    flexDirection: "row",
    height: 54,
    width: "100%",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  buttonIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    fontWeight: "bold",
    fontSize: 13,
    textAlign: "center",
    flexShrink: 1,
  },
  dateText: {
    marginBottom: 20,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    textTransform: "capitalize",
  },
});
