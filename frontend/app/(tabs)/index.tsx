import DateRangePicker, { DatePickerHandle } from '@/components/DatePicker';
import FilterAccordion from '@/components/FilterAccordion';
import FilterSlider from '@/components/FilterSlider';
import NoResults from '@/components/NoResults';
import PageHeader from '@/components/PageHeader';
import ScoreToggle from '@/components/ScoreToggle';
import Separator from '@/components/Separator';
import SliderDatePicker from '@/components/SliderDatePicker';
import TeamFilter from '@/components/TeamFilter';
import { ThemedElements } from '@/components/ThemedElements';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/context/AuthContext';
import { HorizontalScrollProvider, useHorizontalScroll } from '@/context/HorizontalScrollContext';
import { useFavoriteColor } from '@/hooks/useFavoriteColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { getGamesStatus } from '@/utils/date';
import { Ionicons } from '@expo/vector-icons';
import { Icon } from '@rneui/themed';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, ScrollView, useColorScheme, useWindowDimensions, View } from 'react-native';
import Accordion from '../../components/Accordion';
import { ActionButton, ActionButtonRef } from '../../components/ActionButton';
import LoadingView from '../../components/LoadingView';
import { GameStatus, League } from '../../constants/enum';
import { fetchDateRangeLimits, getDateRangeLimits } from '../../utils/dateRange';
import {
  fetchClosestDates,
  fetchGamesByHour,
  fetchLeagues,
  fetchLiveScores,
  fetchTeams,
  getCache,
  saveCache,
} from '../../utils/fetchData';
import { GameFormatted, Team } from '../../utils/types';
import { getFilterAccordionLabel, translateFilterLabel, translateWord } from '../../utils/utils';

const formatDateLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const groupGamesByHour = (games: GameFormatted[]) => {
  const grouped: { [key: string]: GameFormatted[] } = {};
  games.forEach((game) => {
    const date = new Date(game.startTimeUTC);
    const hours = date.getHours().toString().padStart(2, '0');
    const hour = `${hours}:00`;

    if (!grouped[hour]) {
      grouped[hour] = [];
    }
    grouped[hour].push(game);
  });
  return grouped;
};

const getNextGamesFromApi = async (date: Date): Promise<{ [key: string]: GameFormatted[] }> => {
  const today = new Date(date);
  const todayYYYYMMDD = formatDateLocal(today);
  const newFetch: { [key: string]: GameFormatted[] } = {};
  for (let i = 0; i <= 5; i++) {
    const nextDate = new Date(todayYYYYMMDD);
    nextDate.setDate(nextDate.getDate() + i);
    const nextYYYYMMDD = formatDateLocal(nextDate);
    const gamesByHour = await fetchGamesByHour(nextYYYYMMDD, 1000);
    newFetch[nextYYYYMMDD] = Object.values(gamesByHour).flat();
  }
  // Return fetched days to caller so caller (component) can merge into its cache and persist
  return newFetch;
};

const pruneOldGamesCache = (cache: { [key: string]: GameFormatted[] }) => {
  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() - 1);
  const limitDateStr = formatDateLocal(limitDate);
  const prunedEntries = Object.entries(cache).filter(([date]) => date >= limitDateStr);
  return Object.fromEntries(prunedEntries);
};

const GameofTheDayContent = () => {
  const { width } = useWindowDimensions();
  const isSmallDevice = width < 768;
  const { user, firestoreReady } = useAuth();
  const router = useRouter();
  const { date: dateParam } = useLocalSearchParams<{ date: string }>();
  const { isScrollingHorizontally } = useHorizontalScroll();
  const allLeaguesList = Object.values(League);
  const currentDate = new Date();
  const [games, setGames] = useState<GameFormatted[]>([]);
  const [selectDate, setSelectDate] = useState<Date>(() => {
    if (dateParam) {
      const param = Array.isArray(dateParam) ? dateParam[0] : dateParam;
      const d = new Date(param);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return currentDate;
  });
  const [selectLeagues, setSelectLeagues] = useState<League[]>(getCache<League[]>('leaguesSelected') || allLeaguesList);
  const [userLeagues, setUserLeagues] = useState<League[]>(
    () => getCache<League[]>('leaguesSelected') || allLeaguesList,
  );
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>(() => getCache<string[]>('favoriteTeams') || []);
  // Add state for the filter slider
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [showScores, setShowScores] = useState<boolean>(false);
  const [dateAccordionExpanded, setDateAccordionExpanded] = useState<boolean>(true);
  const [leagueAccordionExpanded, setLeagueAccordionExpanded] = useState<boolean>(false);

  const [leaguesAvailable, setLeaguesAvailable] = useState<string[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const retryIntervals = useMemo(() => [1000, 10000, 20000, 30000], []);
  const [isLoading, setIsLoading] = useState(true);
  const readonlyRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const [closestDates, setClosestDates] = useState<{ previousDate: string | null; nextDate: string | null }>({
    previousDate: null,
    nextDate: null,
  });
  const closestRequestRef = useRef('');
  // Stores the resolved uniqueId of the selected team (slider = label → resolved via the teams cache; modal = uniqueId directly).
  // Lets the 'closest' effect filter by team even when the day is empty (empty games → no way to resolve from games).
  const [selectedTeamUniqueId, setSelectedTeamUniqueId] = useState('');

  const [dateLimits, setDateLimits] = useState(() => getDateRangeLimits());

  useEffect(() => {
    fetchDateRangeLimits().then(setDateLimits);
  }, []);

  // Preload the 'teams' cache (24h) on mount to guarantee that getCache<Team[]>('teams')
  // is available when the user filters by team through the slider (label → uniqueId resolution).
  useEffect(() => {
    fetchTeams().catch(() => {});
  }, []);

  const { minDate, maxDate } = dateLimits;

  const [gamesSelected, setGamesSelected] = useState<GameFormatted[]>(
    () => getCache<GameFormatted[]>('gameSelected') || [],
  );

  const [teamSelectedId, setTeamSelectedId] = useState<string>('');
  const gamesDayCache = useRef<{ [key: string]: GameFormatted[] }>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const ActionButtonRef = useRef<ActionButtonRef>(null);
  const dateRangePickerRef = useRef<DatePickerHandle>(null);
  const gamesRef = useRef<GameFormatted[]>([]);

  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';
  const defaultColor = isDark ? '#ffffff' : '#0f172a';
  const { textColor: selectedTextColor } = useFavoriteColor('#000');

  const isAnyGameSelectedToday = useMemo(() => {
    const todayStr = formatDateLocal(selectDate);
    return gamesSelected.some((g) => {
      const gDate = g.gameDate || (g.startTimeUTC ? formatDateLocal(new Date(g.startTimeUTC)) : '');
      return gDate === todayStr;
    });
  }, [gamesSelected, selectDate]);

  useEffect(() => {
    gamesRef.current = games;
  }, [games]);

  const selectDateRef = useRef(selectDate);
  const isScrollingHorizontallyRef = useRef(isScrollingHorizontally);
  const isInternalChange = useRef(false);

  useEffect(() => {
    selectDateRef.current = selectDate;
  }, [selectDate]);

  const fetchAndMergeLiveScores = useCallback(async (currentGames: GameFormatted[]) => {
    const now = new Date();
    const gamesToUpdate = currentGames.filter((g) => {
      const startTime = new Date(g.startTimeUTC);
      const hoursDiff = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      return (
        hoursDiff > -0.25 && g.gameStatus !== 'FINAL' && g.gameStatus !== 'FINISHED' && g.gameStatus !== 'POSTPONED'
      );
    });

    if (gamesToUpdate.length === 0) return null;

    const ids = gamesToUpdate.map((g) => g.uniqueId);
    const chunkSize = 6;
    const chunks = [];
    for (let i = 0; i < ids.length; i += chunkSize) {
      chunks.push(ids.slice(i, i + chunkSize));
    }

    try {
      const results = await Promise.all(chunks.map((chunk) => fetchLiveScores(chunk).catch(() => null)));
      const liveData = results.reduce<GameFormatted[]>((acc, res) => {
        if (Array.isArray(res)) {
          return acc.concat(res);
        }
        return acc;
      }, []);

      const newGames = currentGames
        .map((g) => {
          const liveGame = liveData.find((l) => l.uniqueId === g.uniqueId);
          return liveGame ? { ...g, ...liveGame } : g;
        })
        .filter((g) => {
          return g.isActive;
        });
      return newGames;
    } catch (error: unknown) {
      console.error('Error fetching live scores:', error);
    }
    return null;
  }, []);

  useFocusEffect(
    useCallback(() => {
      let intervalId: NodeJS.Timeout;

      const updateLiveScores = async () => {
        const currentGames = gamesRef.current;
        if (currentGames.length === 0) return;

        const updatedGames = await fetchAndMergeLiveScores(currentGames);
        if (updatedGames) {
          setGames(updatedGames);
          const todayStr = formatDateLocal(new Date());
          const viewedDateStr = formatDateLocal(selectDateRef.current);
          if (todayStr === viewedDateStr && gamesDayCache.current[todayStr]) {
            gamesDayCache.current[todayStr] = updatedGames;
          }
        }
      };

      updateLiveScores();
      intervalId = setInterval(updateLiveScores, 30000);

      return () => clearInterval(intervalId);
    }, [fetchAndMergeLiveScores]),
  );

  useEffect(() => {
    isScrollingHorizontallyRef.current = isScrollingHorizontally;
  }, [isScrollingHorizontally]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Don't capture horizontal swipes if we're scrolling horizontally (e.g., in FilterSlider)
        if (isScrollingHorizontallyRef.current) {
          return false;
        }
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderEnd: (evt, gestureState) => {
        if (Math.abs(gestureState.dx) > 50) {
          const currentDate = selectDateRef.current;
          const newDate = new Date(currentDate);
          if (gestureState.dx > 0) {
            newDate.setDate(newDate.getDate() - 1);
          } else {
            newDate.setDate(newDate.getDate() + 1);
          }
          handleDateChange(newDate, newDate);
        }
      },
    }),
  ).current;

  useEffect(() => {
    const updateFavorites = () => {
      setFavoriteTeams(getCache<string[]>('favoriteTeams') || []);
    };
    if (globalThis.window !== undefined) {
      globalThis.window.addEventListener('favoritesUpdated', updateFavorites);
      return () => globalThis.window.removeEventListener('favoritesUpdated', updateFavorites);
    }
  }, []);

  useEffect(() => {
    const updateSelected = () => {
      setGamesSelected(getCache<GameFormatted[]>('gameSelected') || []);
    };
    if (globalThis.window !== undefined) {
      globalThis.window.addEventListener('gamesSelectedUpdated', updateSelected);
      return () => globalThis.window.removeEventListener('gamesSelectedUpdated', updateSelected);
    }
  }, []);

  useEffect(() => {
    const updateScores = () => {
      const cached = getCache<boolean>('showScores');
      setShowScores(cached ?? false);
    };
    updateScores();
    if (globalThis.window !== undefined) {
      globalThis.window.addEventListener('scoresUpdated', updateScores);
      return () => globalThis.window.removeEventListener('scoresUpdated', updateScores);
    }
  }, []);

  const { width: windowWidth } = useWindowDimensions();

  const disabledLeagues = useMemo(() => {
    const activeLeaguesInGames = new Set(games.map((game) => game.league));
    return userLeagues.filter((league) => !activeLeaguesInGames.has(league));
  }, [games, userLeagues]);

  const disabledFilters: string[] = useMemo(() => {
    const disabled: string[] = [...disabledLeagues];
    // The favorites (bookmark) chip only opens a list when at least one favorite game exists
    // for the displayed date: with nothing to show it is dimmed and not tappable
    // (same rule as the filled/outlined icon, based on `isAnyGameSelectedToday`).
    if (!isAnyGameSelectedToday) {
      disabled.push('BOOKMARKS');
    }
    return disabled;
  }, [disabledLeagues, isAnyGameSelectedToday]);

  const visibleGamesByHour = useMemo(() => {
    const sortGamesByFavorites = (gamesToSort: GameFormatted[]) => {
      return gamesToSort.sort((a, b) => {
        const aIsFavorite = favoriteTeams.includes(a.homeTeamId) || favoriteTeams.includes(a.awayTeamId);
        const bIsFavorite = favoriteTeams.includes(b.homeTeamId) || favoriteTeams.includes(b.awayTeamId);

        if (aIsFavorite && !bIsFavorite) return -1;
        if (!aIsFavorite && bIsFavorite) return 1;

        if (aIsFavorite && bIsFavorite) {
          const getFavoriteIndex = (game: GameFormatted) => {
            const homeIndex = favoriteTeams.indexOf(game.homeTeamId);
            const awayIndex = favoriteTeams.indexOf(game.awayTeamId);
            const validIndexes = [homeIndex, awayIndex].filter((i) => i > -1);
            return Math.min(...validIndexes);
          };
          return getFavoriteIndex(a) - getFavoriteIndex(b);
        }

        return 0;
      });
    };

    const relevantGames = games
      .filter(
        (game) =>
          game.isActive &&
          selectLeagues.includes(game.league as League) &&
          (!teamSelectedId ||
            game.homeTeamId === teamSelectedId ||
            game.awayTeamId === teamSelectedId ||
            game.homeTeam === teamSelectedId ||
            game.awayTeam === teamSelectedId) &&
          (activeFilter !== 'FAVORITES' ||
            favoriteTeams.includes(game.homeTeamId) ||
            favoriteTeams.includes(game.awayTeamId)) &&
          (activeFilter !== 'BOOKMARKS' ||
            gamesSelected.some((g) => g.uniqueId === game.uniqueId || g._id === game._id)),
      )
      .sort((a, b) => new Date(a.startTimeUTC).getTime() - new Date(b.startTimeUTC).getTime());

    const inProgress: GameFormatted[] = [];
    const final: GameFormatted[] = [];
    const finished: GameFormatted[] = [];
    const scheduled: GameFormatted[] = [];

    relevantGames.forEach((game) => {
      const status = getGamesStatus(game);
      const hasScore = game.homeTeamScore != null && game.awayTeamScore != null;
      const startTime = new Date(game.startTimeUTC);
      const isBeforeStart = new Date() < startTime;
      const isLive =
        status === GameStatus.IN_PROGRESS ||
        (game.gameStatus &&
          ['Top', 'Bot', 'Mid', 'End', '1st', '2nd', '3rd', '4th', 'OT', 'Half', "'", 'In SO'].some((s) =>
            game.gameStatus!.includes(s),
          ) &&
          !game.gameStatus.toUpperCase().includes('FINAL') &&
          !game.gameStatus.toUpperCase().includes('ENDED')) ||
        (hasScore && status !== GameStatus.FINAL && status !== GameStatus.FINISHED);

      const isFinal = status === GameStatus.FINAL || game.gameStatus?.toUpperCase().includes('FINAL');
      const isFinished = status === GameStatus.FINISHED || game.gameStatus?.toUpperCase().includes('ENDED');

      if ((isLive || !isBeforeStart) && !isFinal && !isFinished) {
        inProgress.push(game);
      } else if (isFinal) {
        final.push(game);
      } else if (isFinished) {
        finished.push(game);
      } else if (hasScore && !isBeforeStart) {
        finished.push(game);
      } else {
        // Game is actually scheduled
        scheduled.push(game);
      }
    });

    const scheduledGrouped = groupGamesByHour(scheduled);

    const groups: { hour: string; games: GameFormatted[] }[] = [];

    if (inProgress.length > 0) {
      groups.push({ hour: translateWord('inProgress'), games: sortGamesByFavorites(inProgress) });
    }

    Object.keys(scheduledGrouped)
      .sort()
      .forEach((hour) => {
        groups.push({ hour, games: sortGamesByFavorites(scheduledGrouped[hour]) });
      });

    groups.sort((a, b) => {
      const timeA = a.games[0]?.startTimeUTC ? new Date(a.games[0].startTimeUTC).getTime() : 0;
      const timeB = b.games[0]?.startTimeUTC ? new Date(b.games[0].startTimeUTC).getTime() : 0;
      return timeA - timeB;
    });
    if (final.length > 0) {
      groups.push({ hour: translateWord('final'), games: sortGamesByFavorites(final) });
    }
    if (finished.length > 0) {
      groups.push({ hour: translateWord('ended'), games: sortGamesByFavorites(finished) });
    }

    return groups;
  }, [games, selectLeagues, teamSelectedId, activeFilter, favoriteTeams]);

  const getGamesFromApi = useCallback(
    async (dateToFetch: Date) => {
      const YYYYMMDD = formatDateLocal(dateToFetch);
      const today = formatDateLocal(new Date());

      if (YYYYMMDD < today) {
        if (gamesDayCache.current[YYYYMMDD]) {
          delete gamesDayCache.current[YYYYMMDD];
          saveCache('gamesDay', gamesDayCache.current);
        }
        try {
          const gamesByHourData = await fetchGamesByHour(YYYYMMDD, 1000);
          const gamesOfTheDay = Object.values(gamesByHourData).flat();
          setGames(gamesOfTheDay);
        } catch (error: unknown) {
          console.error(error);
          setGames([]);
        }
        return;
      }

      // Check cache first
      const cachedGames = gamesDayCache.current[YYYYMMDD];
      if (cachedGames) {
        let gamesToDisplay = cachedGames;

        if (YYYYMMDD === today) {
          const yesterday = new Date(dateToFetch);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayYYYYMMDD = yesterday.toISOString().split('T')[0];
          const cachedYesterday = gamesDayCache.current[yesterdayYYYYMMDD];

          if (cachedYesterday) {
            const nowMinusThreeHour = new Date(Date.now() - 3 * 60 * 60 * 1000);
            const recentYesterdayGames = cachedYesterday.filter(
              ({ startTimeUTC = '', homeTeamScore, awayTeamScore }) =>
                new Date(startTimeUTC) >= nowMinusThreeHour && homeTeamScore === null && awayTeamScore === null,
            );
            const combined = [...recentYesterdayGames, ...cachedGames];
            gamesToDisplay = combined.filter(
              (game, index, self) => index === self.findIndex((t) => t._id === game._id),
            );
          }
          setGames(gamesToDisplay);

          // Try to update live scores immediately for cached content
          fetchAndMergeLiveScores(gamesToDisplay).then((updated) => {
            if (updated) {
              setGames(updated);
              gamesDayCache.current[YYYYMMDD] = updated;
            }
          });
        } else {
          setGames(gamesToDisplay);
        }
      }

      // Fetch from API if not in cache
      try {
        const gamesByHourData = await fetchGamesByHour(YYYYMMDD, 1000);
        let allGames = Object.values(gamesByHourData).flat();

        // Try to update live scores immediately for new content
        if (YYYYMMDD === today) {
          const updated = await fetchAndMergeLiveScores(allGames);
          if (updated) {
            allGames = updated;
          }
        }

        setGames(allGames);
        gamesDayCache.current[YYYYMMDD] = allGames;

        if (YYYYMMDD === today) {
          getNextGamesFromApi(dateToFetch).then((nextFetchedGames) => {
            gamesDayCache.current = pruneOldGamesCache({ ...gamesDayCache.current, ...nextFetchedGames });
            saveCache('gamesDay', gamesDayCache.current);
          });
        } else {
          // For other days, save the cache that was updated in the if/else block
          saveCache('gamesDay', gamesDayCache.current);
        }
      } catch (error: unknown) {
        console.error(error);
        if (!cachedGames) {
          gamesDayCache.current[YYYYMMDD] = [];
          const prunedEmpty = pruneOldGamesCache({ ...(gamesDayCache.current || {}) });
          gamesDayCache.current = prunedEmpty;
          saveCache('gamesDay', prunedEmpty);
          setGames([]);
        }
      }
    },
    [fetchAndMergeLiveScores],
  );

  const handleDateChange = useCallback(
    (startDate: Date, endDate: Date) => {
      const dateStr = formatDateLocal(startDate);
      const currentStr = formatDateLocal(selectDateRef.current);

      router.setParams({ date: dateStr });

      if (dateStr === currentStr) {
        return;
      }

      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      readonlyRef.current = true;
      isInternalChange.current = true;
      setSelectDate(startDate);

      const YYYYMMDD = dateStr;
      if (!gamesDayCache.current[YYYYMMDD]) {
        setIsLoading(true);
      }

      getGamesFromApi(startDate).finally(() => {
        readonlyRef.current = false;
        setIsLoading(false);
      });
    },
    [getGamesFromApi, router],
  );

  const handleFilterChange = useCallback(
    (filter: string) => {
      setActiveFilter(filter);
      if (filter === 'ALL') {
        // Reset to all leagues and clear team selection
        setSelectLeagues(userLeagues);
        setTeamSelectedId('');
      } else if (filter === 'FAVORITES' || filter === 'BOOKMARKS') {
        setSelectLeagues(allLeaguesList);
        setTeamSelectedId('');
      } else {
        // Specific league
        setSelectLeagues([filter as League]);
        setTeamSelectedId('');
      }
    },
    [allLeaguesList, userLeagues],
  );

  const handleTeamSelectionChange = useCallback((teamId: string | string[]) => {
    const finalTeamId = Array.isArray(teamId) ? teamId[0] : teamId;
    setTeamSelectedId(finalTeamId);
    // The modal sends the uniqueId directly: store it for the 'closest' effect.
    setSelectedTeamUniqueId(finalTeamId);
  }, []);
const handleDateAccordionExpanded = useCallback((expanded: boolean) => {
    setDateAccordionExpanded(expanded);
  }, []);

  // Open the calendar datepicker (loupe button). The league/team filter accordion
  // is left in its current state (open or closed) — the calendar now renders in a
  // centered modal, so it no longer needs extra vertical space in the page.
  const openCalendarDatepicker = useCallback(() => {
    dateRangePickerRef.current?.open();
  }, []);

  // Retry mechanism when no games are found (NoResults is visible)
  useEffect(() => {
    if (!isLoading && visibleGamesByHour.length === 0 && retryCount < retryIntervals.length) {
      const timer = setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        getGamesFromApi(selectDate);
      }, retryIntervals[retryCount]);

      return () => clearTimeout(timer);
    }
  }, [isLoading, visibleGamesByHour.length, retryCount, getGamesFromApi, selectDate, retryIntervals]);

  // Reset retry count when filter or date changes
  useEffect(() => {
    setRetryCount(0);
  }, [selectDate, selectLeagues, teamSelectedId, activeFilter]);

  // When no game is visible for the day + current filter, query the 'closest'
  // route with the displayed date as boundary:
  // - specific team selected → teamSelectedIds (uniqueId already resolved in selectedTeamUniqueId);
  // - otherwise ("ALL") → leagues (the filtered league, e.g. MLB).
  useEffect(() => {
    if (isLoading || visibleGamesByHour.length > 0) {
      if (visibleGamesByHour.length > 0) {
        closestRequestRef.current = '';
        setClosestDates({ previousDate: null, nextDate: null });
      }
      return;
    }
    // Index contract: displayed date (boundary) + specific team when one is selected,
    // otherwise the filtered league when the team filter is on "ALL".
    // selectedTeamUniqueId holds the uniqueId resolved at selection time
    // (slider: label → resolved via the teams cache; modal: uniqueId directly),
    // so it is usable even when the day is empty (empty games).
    // Safety fallback: when selectedTeamUniqueId is empty but teamSelectedId
    // is a label (contains a space), resolve it via fetchTeams() (24h cache) before the call.
    // This covers the case where the 'teams' cache was not loaded yet at click time.
    // Effective league: explicit league filter (e.g. MLB via handleFilterChange),
    // excluding the ALL / FAVORITES / BOOKMARKS pseudo-filters.
    const effectiveLeague =
      activeFilter !== 'ALL' && activeFilter !== 'FAVORITES' && activeFilter !== 'BOOKMARKS'
        ? activeFilter
        : selectLeagues.length === 1 && selectLeagues[0] !== ('ALL' as League)
          ? selectLeagues[0]
          : '';
    const requestKey = [
      formatDateLocal(selectDate),
      selectedTeamUniqueId
        ? `team:${selectedTeamUniqueId}`
        : teamSelectedId && teamSelectedId.includes(' ')
          ? `team:${teamSelectedId}`
          : `league:${effectiveLeague || '-'}`,
    ].join('|');
    if (closestRequestRef.current === requestKey) {
      return;
    }
    closestRequestRef.current = requestKey;
    let cancelled = false;
    let completed = false;
    (async () => {
      try {
        let resolvedTeamId = selectedTeamUniqueId;
        if (!resolvedTeamId && teamSelectedId && teamSelectedId.includes(' ')) {
          try {
            const teams = await fetchTeams();
            resolvedTeamId = teams?.find((t) => t.label === teamSelectedId)?.uniqueId ?? '';
          } catch {
            resolvedTeamId = '';
          }
        }
        const useTeam = !!resolvedTeamId;
        const closest = useTeam
          ? await fetchClosestDates({
              teamSelectedId: resolvedTeamId,
              date: formatDateLocal(selectDate),
            })
          : await fetchClosestDates({
              league: effectiveLeague || undefined,
              date: formatDateLocal(selectDate),
            });
        completed = true;
        if (!cancelled) {
          setClosestDates({
            previousDate: closest?.previousDate ?? null,
            nextDate: closest?.nextDate ?? null,
          });
        }
      } catch {
        completed = true;
        if (!cancelled) {
          setClosestDates({ previousDate: null, nextDate: null });
        }
      }
    })();
    return () => {
      cancelled = true;
      if (!completed) {
        closestRequestRef.current = '';
      }
    };
    // selectedTeamUniqueId replaces games for team resolution (day-independent).
  }, [isLoading, visibleGamesByHour.length, selectDate, selectedTeamUniqueId, teamSelectedId, selectLeagues, activeFilter]);

  const hasFavorites = useMemo(() => {
    return games.some((game) => favoriteTeams.includes(game.homeTeamId) || favoriteTeams.includes(game.awayTeamId));
  }, [games, favoriteTeams]);

  useEffect(() => {
    if (activeFilter === 'FAVORITES' && !hasFavorites && !isLoading) {
      setActiveFilter('ALL');
      setSelectLeagues(userLeagues);
      setTeamSelectedId('');
    }
  }, [activeFilter, hasFavorites, isLoading, userLeagues]);

  const handleScoreToggle = useCallback((value: boolean) => {
    setShowScores(value);
  }, []);

  const teamsOfTheDay = useMemo(() => {
    const teamsMap = new Map<string, Team>();

    games.forEach((game) => {
      if (!selectLeagues.includes(game.league as League)) return;

      // Use unique ID to distinguish teams with same name in different leagues
      if (!teamsMap.has(game.homeTeamId)) {
        teamsMap.set(game.homeTeamId, {
          uniqueId: game.homeTeamId,
          value: game.homeTeamId,
          id: game.homeTeamId,
          label: game.homeTeam,
          teamLogo: game.homeTeamLogo,
          teamCommonName: game.homeTeam,
          league: game.league,
          abbrev: game.homeTeamShort,
          conferenceName: '',
          divisionName: '',
          updateDate: '',
        });
      }
      if (!teamsMap.has(game.awayTeamId)) {
        teamsMap.set(game.awayTeamId, {
          uniqueId: game.awayTeamId,
          value: game.awayTeamId,
          id: game.awayTeamId,
          label: game.awayTeam,
          teamLogo: game.awayTeamLogo,
          teamCommonName: game.awayTeam,
          league: game.league,
          abbrev: game.awayTeamShort,
          conferenceName: '',
          divisionName: '',
          updateDate: '',
        });
      }
    });

    return Array.from(teamsMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [games, selectLeagues]);

  const leagueAccordionLabel = useMemo(() => {
    const selectedTeam = teamSelectedId
      ? teamsOfTheDay.find((t) => t.uniqueId === teamSelectedId || t.label === teamSelectedId)
      : null;
    const { prefix, value } = getFilterAccordionLabel({
      prefix: translateFilterLabel('league_team'),
      fallbackLabel: translateFilterLabel(isSmallDevice ? 'league_team' : 'league'),
      activeFilter,
      selectedTeam,
      expanded: leagueAccordionExpanded,
    });
    if (value) {
      return (
        <span>
          {prefix} :{' '}
          <i>
            <b>{value}</b>
          </i>
        </span>
      );
    }
    return prefix;
  }, [teamSelectedId, teamsOfTheDay, activeFilter, isSmallDevice, leagueAccordionExpanded]);

  const displayScoreToggle = useCallback(() => {
    return <PageHeader rightElement={<ScoreToggle value={showScores} onValueChange={handleScoreToggle} />} />;
  }, [showScores, handleScoreToggle, user]);

  const displayFilters = useCallback(() => {
    const handleTeamFilterChange = (val: string) => {
      if (val === 'ALL') {
        setTeamSelectedId('');
        setSelectedTeamUniqueId('');
      } else {
        // The slider sends a label (e.g. "New Jersey Devils"): resolve it to the uniqueId
        // through the 'teams' cache (24h) so the 'closest' effect can filter by team
        // even when the displayed day is empty (empty games → no way to resolve from games).
        const cachedTeams = getCache<Team[]>('teams');
        const resolved = cachedTeams?.find((t) => t.label === val)?.uniqueId ?? '';
        setTeamSelectedId(val);
        setSelectedTeamUniqueId(resolved);
      }
    };

    const uniqueTeamLabels = Array.from(new Set(teamsOfTheDay.map((t) => t.label)));

    // If teamSelectedId is a uniqueId (from modal), find the label. Otherwise it's already a label (from slider).
    const selectedLabel = teamsOfTheDay.find((t) => t.uniqueId === teamSelectedId)?.label || teamSelectedId || 'ALL';

    // Ensure the selected element is visible in the list even if no games exist for it today
    if (selectedLabel !== 'ALL' && !uniqueTeamLabels.includes(selectedLabel)) {
      uniqueTeamLabels.push(selectedLabel);
    }

    uniqueTeamLabels.sort((a, b) => a.localeCompare(b));

    const teamFilterData = [
      { label: translateWord('all'), value: 'ALL' },
      ...uniqueTeamLabels.map((label) => ({ label, value: label })),
    ];

    const modalItems = teamsOfTheDay.map((t) => ({
      ...t,
      label: `${t.label} (${t.league})`,
    }));

    // Only pass the ID to the modal if it actually exists in the current items list.
    const modalItemSelectedId = teamsOfTheDay.find((t) => t.uniqueId === teamSelectedId) ? teamSelectedId : '';

    const favoriteLabels = Array.from(
      new Set(teamsOfTheDay.filter((t) => favoriteTeams.includes(t.uniqueId)).map((t) => t.label)),
    );

    return (
      <TeamFilter
        icon={<Ionicons name="search" size={24} color="white" />}
        selectorData={{
          i: 'teamsOfDay',
          items: modalItems as any,
          itemSelectedId: modalItemSelectedId,
          itemsSelectedIds: [],
        }}
        onSelectorChange={handleTeamSelectionChange}
        selectorPlaceholder={translateWord('filterTeams')}
        isClearable={true}
        filterData={teamFilterData}
        selectedFilter={selectedLabel}
        onFilterChange={handleTeamFilterChange}
        favoriteValues={favoriteLabels}
      />
    );
  }, [leaguesAvailable, selectLeagues, teamsOfTheDay, teamSelectedId, handleTeamSelectionChange, favoriteTeams]);

  const displayNoContent = useCallback(() => {
    if (isLoading) {
      return <LoadingView />;
    } else {
      // Re-fetch games for the current date while preserving the current filters
      // (leagues, team, active filter) instead of reloading the whole page.
      return <NoResults onRetry={() => getGamesFromApi(selectDate)} />;
    }
  }, [isLoading, getGamesFromApi, selectDate]);

  const goToClosestDate = useCallback(
    (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      if (!y || !m || !d) return;
      handleDateChange(new Date(y, m - 1, d), new Date(y, m - 1, d));
    },
    [handleDateChange],
  );

  const displayContent = useCallback(() => {
    if (!games || games.length === 0) {
      return displayNoContent();
    }

    if (visibleGamesByHour.length === 0) {
      // When the 'closest' route found dates with games for the
      // current filters, offer to navigate to the previous/next date.
      const closestProps =
        !isLoading && (closestDates.previousDate || closestDates.nextDate)
          ? {
              previousAvailableDate: closestDates.previousDate,
              nextAvailableDate: closestDates.nextDate,
              onGoToDate: goToClosestDate,
            }
          : {};
      // If the user has a filter active (not "All"), offer a way to switch back
      // to the "All" option when the retry cooldown is active.
      const isFiltered =
        activeFilter !== 'ALL' || teamSelectedId !== '' || selectLeagues.length !== allLeaguesList.length;
      if (isFiltered) {
        return (
          <NoResults
            onRetry={() => getGamesFromApi(selectDate)}
            onShowAll={() => handleFilterChange('ALL')}
            {...closestProps}
          />
        );
      }
      return <NoResults onRetry={() => getGamesFromApi(selectDate)} {...closestProps} />;
    }

    return (
      <ThemedView style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.3s' } as any}>
        {visibleGamesByHour.map(({ hour, games }, i) => (
          <div key={hour} style={{ width: '100%', margin: '0 auto' }}>
            <Accordion
              filter={hour}
              i={i}
              gamesFiltred={games}
              open={true}
              isCounted={false}
              disableToggle={false}
              gamesSelected={gamesSelected}
              showScores={showScores}
            />
          </div>
        ))}
      </ThemedView>
    );
  }, [
    games,
    displayNoContent,
    visibleGamesByHour,
    gamesSelected,
    showScores,
    isLoading,
    activeFilter,
    teamSelectedId,
    selectLeagues,
    allLeaguesList,
    handleFilterChange,
    closestDates,
    goToClosestDate,
  ]);

  useEffect(() => {
    const updateLeagues = () => {
      const stored = getCache<League[]>('leaguesSelected');
      if (stored) {
        setSelectLeagues(stored);
        setUserLeagues(stored);
        gamesDayCache.current = {};
        saveCache('gamesDay', {});
        setIsLoading(true);
        getGamesFromApi(selectDateRef.current).finally(() => setIsLoading(false));
      }
    };
    if (globalThis.window !== undefined) {
      globalThis.window.addEventListener('leaguesUpdated', updateLeagues);
      return () => globalThis.window.removeEventListener('leaguesUpdated', updateLeagues);
    }
  }, [getGamesFromApi]);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    // Wait for Firestore sync to complete before initializing from local cache
    if (!firestoreReady) return;
    hasInitializedRef.current = true;

    async function initializeGames() {
      fetchLeagues(setLeaguesAvailable);
      // restore persisted games cache (current day + next 5 days)
      const localStorageGamesDay = getCache<{ [key: string]: GameFormatted[] }>('gamesDay');
      if (localStorageGamesDay) {
        gamesDayCache.current = localStorageGamesDay;
      }
      const storedLeagues = getCache<string[]>('leagues');
      const storedLeaguesSelected = getCache<League[]>('leaguesSelected');

      if (storedLeagues) {
        setLeaguesAvailable(storedLeagues);
      }
      if (storedLeaguesSelected) {
        setSelectLeagues(storedLeaguesSelected);
      }

      // Only show loader if there's no cached data for today
      const YYYYMMDD = formatDateLocal(new Date(selectDate));
      const hasCachedDataForToday = gamesDayCache.current[YYYYMMDD]?.length > 0;

      if (!hasCachedDataForToday) {
        setIsLoading(true);
      }

      try {
        await getGamesFromApi(selectDate);
      } finally {
        setIsLoading(false);
      }
    }

    initializeGames();
  }, [firestoreReady]); // Only run once on mount (once firestore is ready)

  useEffect(() => {
    const param = Array.isArray(dateParam) ? dateParam[0] : dateParam;
    let d = new Date();
    let invalidParam = false;

    if (param) {
      const parsed = new Date(param);
      if (Number.isNaN(parsed.getTime())) {
        invalidParam = true;
      } else {
        const parsedStr = formatDateLocal(parsed);
        if (/^\d{4}-\d{2}-\d{2}$/.test(param) && param !== parsedStr) {
          invalidParam = true;
        } else {
          if (parsed < minDate || parsed > maxDate) {
            invalidParam = true;
          } else {
            d = parsed;
          }
        }
      }
    }

    if (invalidParam) {
      d = new Date();
      setTimeout(() => {
        router.setParams({ date: undefined });
      }, 0);
    }

    const dStr = formatDateLocal(d);
    const currentStr = formatDateLocal(selectDate);

    if (dStr === currentStr) {
      isInternalChange.current = false;
      return;
    }

    if (isInternalChange.current) return;

    setSelectDate(d);
    const YYYYMMDD = dStr;
    if (!gamesDayCache.current[YYYYMMDD]) {
      setIsLoading(true);
    }
    getGamesFromApi(d).finally(() => setIsLoading(false));
  }, [dateParam, selectDate, getGamesFromApi, router, minDate, maxDate]);

  useFocusEffect(
    useCallback(() => {
      setGamesSelected(getCache<GameFormatted[]>('gameSelected') || []);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  const backgroundColor = useThemeColor({ light: '#F0F0F0', dark: '#121212' }, 'background');

  return (
    <ThemedView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scrollViewRef}
          onScroll={(event) => ActionButtonRef.current?.handleScroll(event)}
          scrollEventThrottle={16}
        >
          <div style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <ThemedView style={{ backgroundColor }}>
              <div style={{ position: 'relative', zIndex: 20 }}>
                {displayScoreToggle()}
                <div
                  style={
                    !isSmallDevice
                      ? {
                          width: windowWidth < 1200 ? '95%' : '100%',
                          margin: '0 auto',
                          padding: '0 10 10 10',
                          boxSizing: 'border-box',
                          backgroundColor: backgroundColor,
                        }
                      : {}
                  }
                >
                  <ThemedElements>
                    <FilterAccordion
                      label={leagueAccordionLabel}
                      defaultOpen={false}
                      isSmallDevice={isSmallDevice}
                      expanded={leagueAccordionExpanded}
                      onExpandedChange={setLeagueAccordionExpanded}
                    >
                      <FilterSlider
                        selectedFilter={activeFilter}
                        onFilterChange={handleFilterChange}
                        data={[
                          { label: translateWord('all'), value: 'ALL' },
                          ...userLeagues.filter((l) => l !== 'ALL').map((l) => ({ label: l, value: l })),
                          {
                            label: '',
                            value: 'BOOKMARKS',
                            icon: (
                              <Icon
                                name={isAnyGameSelectedToday ? 'bookmark' : 'bookmark-o'}
                                type="font-awesome"
                                size={18}
                                color={activeFilter === 'BOOKMARKS' ? selectedTextColor : defaultColor}
                              />
                            ),
                          },
                        ]}
                        disabledValues={disabledFilters}
                      />
                      {isSmallDevice && (
                        <div style={{ marginTop: 10, marginBottom: 10 }}>
                          <Separator />
                        </div>
                      )}

                      {isSmallDevice && displayFilters()}
                    </FilterAccordion>
                  </ThemedElements>

                  {!isSmallDevice && (
                    <ThemedElements>
                      <FilterAccordion label={translateFilterLabel('team')} defaultOpen={true} isSmallDevice={false}>
                        {displayFilters()}
                      </FilterAccordion>
                    </ThemedElements>
                  )}

                  <ThemedElements>
                    <FilterAccordion
                      label={
                        isSmallDevice && !dateAccordionExpanded ? (
                          <span>
                            {translateFilterLabel('date')} :{' '}
                            <i>
                              <b>
                                {new Date(selectDate).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </b>
                            </i>
                          </span>
                        ) : (
                          translateFilterLabel('date')
                        )
                      }
                      defaultOpen={false}
                      isSmallDevice={isSmallDevice}
                      onExpandedChange={handleDateAccordionExpanded}
                    >
                      <div>
                        <SliderDatePicker
                          onDateChange={(date) => handleDateChange(date, date)}
                          selectDate={selectDate}
                          disabled={isLoading}
                          minDate={minDate}
                          maxDate={maxDate}
                          onSearch={openCalendarDatepicker}
                        />
                        {/*
                        Hidden date-range picker in single-date mode. It is opened
                        imperatively by the SliderDatePicker loupe button (onSearch) and
                        writes the selected date back to `selectDate` via
                        `handleDateChange`. `showInput={false}` avoids a duplicate
                        input box since the selected date is already displayed
                        in the accordion header above.
                      */}
                        <div style={{ position: 'relative', height: 0 }}>
                          <DateRangePicker
                            ref={dateRangePickerRef}
                            selectDate={selectDate}
                            onDateChange={handleDateChange}
                            showInput={false}
                            title={translateFilterLabel('date')}
                          />
                        </div>
                      </div>
                      <div style={{ paddingTop: 10, paddingBottom: 10 }}>
                        <Separator />
                      </div>
                    </FilterAccordion>
                  </ThemedElements>
                </div>
              </div>
            </ThemedView>
          </div>
          <View {...panResponder.panHandlers}>
            <ThemedView>{displayContent()}</ThemedView>
          </View>
        </ScrollView>
        <ActionButton ref={ActionButtonRef} scrollViewRef={scrollViewRef} />
      </View>
    </ThemedView>
  );
};

export default function GameofTheDay() {
  return (
    <HorizontalScrollProvider>
      <GameofTheDayContent />
    </HorizontalScrollProvider>
  );
}
