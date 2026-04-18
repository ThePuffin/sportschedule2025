import AppLogo from '@/components/AppLogo';
import FilterSlider from '@/components/FilterSlider';
import NoResults from '@/components/NoResults';
import ScoreToggle from '@/components/ScoreToggle';
import Separator from '@/components/Separator';
import SliderDatePicker from '@/components/SliderDatePicker';
import TeamFilter from '@/components/TeamFilter';
import { ThemedElements } from '@/components/ThemedElements';
import { ThemedView } from '@/components/ThemedView';
import { HorizontalScrollProvider, useHorizontalScroll } from '@/context/HorizontalScrollContext';
import { getGamesStatus } from '@/utils/date';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, ScrollView, useWindowDimensions, View } from 'react-native';
import Accordion from '../../components/Accordion';
import { ActionButton, ActionButtonRef } from '../../components/ActionButton';
import LoadingView from '../../components/LoadingView';
import { GameStatus, League } from '../../constants/enum';
import { fetchDateRangeLimits, getDateRangeLimits } from '../../utils/dateRange';
import { fetchGamesByHour, fetchLeagues, fetchLiveScores, getCache, saveCache } from '../../utils/fetchData';
import { GameFormatted } from '../../utils/types';
import { randomNumber, translateWord } from '../../utils/utils';

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
      if (!isNaN(d.getTime())) return d;
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

  const [leaguesAvailable, setLeaguesAvailable] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const readonlyRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const [dateLimits, setDateLimits] = useState(() => getDateRangeLimits());

  useEffect(() => {
    fetchDateRangeLimits().then(setDateLimits);
  }, []);

  const { minDate, maxDate } = dateLimits;

  const [gamesSelected, setGamesSelected] = useState<GameFormatted[]>(
    () => getCache<GameFormatted[]>('gameSelected') || [],
  );

  const [teamSelectedId, setTeamSelectedId] = useState<string>('');
  const gamesDayCache = useRef<{ [key: string]: GameFormatted[] }>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const ActionButtonRef = useRef<ActionButtonRef>(null);
  const gamesRef = useRef<GameFormatted[]>([]);

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

      const newGames = currentGames.map((g) => {
        const liveGame = liveData.find((l) => l.uniqueId === g.uniqueId);
        return liveGame ? { ...g, ...liveGame } : g;
      });
      return newGames;
    } catch (error) {
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

    // TODO: fix the terminé quand le match est en cours
    const relevantGames = games
      .filter(
        (game) =>
          selectLeagues.includes(game.league as League) &&
          (!teamSelectedId || game.homeTeamId === teamSelectedId || game.awayTeamId === teamSelectedId) &&
          game.awayTeamLogo &&
          game.homeTeamLogo &&
          (activeFilter !== 'FAVORITES' ||
            favoriteTeams.includes(game.homeTeamId) ||
            favoriteTeams.includes(game.awayTeamId)),
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
        } catch (error) {
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
          // Pour les autres jours, on sauvegarde le cache qui a été mis à jour dans le if/else
          saveCache('gamesDay', gamesDayCache.current);
        }
      } catch (error) {
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
      } else if (filter === 'FAVORITES') {
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
  }, []);

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

  const displayScoreToggle = useCallback(() => {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '5px 15px 5px 15px',
        }}
      >
        <AppLogo />
        <ScoreToggle value={showScores} onValueChange={handleScoreToggle} />
      </div>
    );
  }, [showScores, handleScoreToggle]);

  const displayFilters = useCallback(() => {
    const handleTeamFilterChange = (val: string) => {
      if (val === 'ALL') {
        handleTeamSelectionChange('');
      } else {
        handleTeamSelectionChange(val);
      }
    };

    const teamFilterData = [
      { label: translateWord('all'), value: 'ALL' },
      ...teamsOfTheDay.map((t) => ({ label: t.label, value: t.uniqueId })),
    ];

    return (
      <TeamFilter
        icon={<Ionicons name="search" size={24} color="white" />}
        selectorData={{
          i: randomNumber(999999),
          items: teamsOfTheDay as any,
          itemSelectedId: teamSelectedId,
          itemsSelectedIds: [],
        }}
        onSelectorChange={handleTeamSelectionChange}
        selectorPlaceholder={translateWord('filterTeams')}
        isClearable={true}
        filterData={teamFilterData}
        selectedFilter={teamSelectedId || 'ALL'}
        onFilterChange={handleTeamFilterChange}
        favoriteValues={favoriteTeams}
      />
    );
  }, [leaguesAvailable, selectLeagues, teamsOfTheDay, teamSelectedId, handleTeamSelectionChange, favoriteTeams]);

  const displayNoContent = useCallback(() => {
    if (isLoading) {
      return <LoadingView />;
    } else {
      return <NoResults />;
    }
  }, [isLoading]);

  const displayContent = useCallback(() => {
    if (!games || games.length === 0) {
      return displayNoContent();
    }

    if (visibleGamesByHour.length === 0) return <NoResults />;

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
  }, [games, displayNoContent, visibleGamesByHour, gamesSelected, showScores, isLoading]);

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
  }, []); // Only run once on mount

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

  return (
    <ThemedView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scrollViewRef}
          onScroll={(event) => ActionButtonRef.current?.handleScroll(event)}
          scrollEventThrottle={16}
        >
          <div style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <ThemedView>
              <div style={{ position: 'relative', zIndex: 20 }}>
                {displayScoreToggle()}
                <div
                  style={
                    windowWidth > 768
                      ? {
                          width: windowWidth < 1200 ? '95%' : '100%',
                          margin: '0 auto',
                          padding: 10,
                          boxSizing: 'border-box',
                        }
                      : {}
                  }
                >
                  <ThemedElements>
                    <FilterSlider
                      selectedFilter={activeFilter}
                      onFilterChange={handleFilterChange}
                      data={[
                        { label: translateWord('all'), value: 'ALL' },
                        ...userLeagues.filter((l) => l !== 'ALL').map((l) => ({ label: l, value: l })),
                      ]}
                    />
                  </ThemedElements>
                  <Separator />
                  {displayFilters()}
                  <Separator />
                  <SliderDatePicker
                    onDateChange={(date) => handleDateChange(date, date)}
                    selectDate={selectDate}
                    disabled={isLoading}
                    minDate={minDate}
                    maxDate={maxDate}
                  />
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
