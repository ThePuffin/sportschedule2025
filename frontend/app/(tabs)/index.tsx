import FilterSlider from '@/components/FilterSlider';
import NoResults from '@/components/NoResults';
import Selector from '@/components/Selector';
import SliderDatePicker from '@/components/SliderDatePicker';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getGamesStatus } from '@/utils/date';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import Accordion from '../../components/Accordion';
import { ActionButton, ActionButtonRef } from '../../components/ActionButton';
import CardLarge from '../../components/CardLarge';
import LoadingView from '../../components/LoadingView';
import { GameStatus, League } from '../../constants/enum';
import { fetchGamesByHour, fetchLeagues, getCache, saveCache } from '../../utils/fetchData';
import { GameFormatted } from '../../utils/types';
import { randomNumber, translateWord } from '../../utils/utils';

const groupGamesByHour = (games: GameFormatted[], roundToHour: boolean = false) => {
  const grouped: { [key: string]: GameFormatted[] } = {};
  games.forEach((game) => {
    const date = new Date(game.startTimeUTC);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    let hour = `${hours}:${minutes}`;
    if (roundToHour) {
      hour = `${hours}:00`;
    }

    if (!grouped[hour]) {
      grouped[hour] = [];
    }
    grouped[hour].push(game);
  });
  return grouped;
};

const getNextGamesFromApi = async (date: Date): Promise<{ [key: string]: GameFormatted[] }> => {
  const dayBefore = new Date(date);
  dayBefore.setDate(dayBefore.getDate() - 1);
  const dayBeforeYYYYMMDD = dayBefore.toISOString().split('T')[0];
  const newFetch: { [key: string]: GameFormatted[] } = {};
  for (let i = 0; i <= 10; i++) {
    const nextDate = new Date(dayBeforeYYYYMMDD);
    nextDate.setDate(nextDate.getDate() + i);
    const nextYYYYMMDD = nextDate.toISOString().split('T')[0];
    const gamesByHour = await fetchGamesByHour(nextYYYYMMDD);
    newFetch[nextYYYYMMDD] = Object.values(gamesByHour).flat();
  }
  // Return fetched days to caller so caller (component) can merge into its cache and persist
  return newFetch;
};

const pruneOldGamesCache = (cache: { [key: string]: GameFormatted[] }) => {
  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() - 1);
  const limitDateStr = limitDate.toISOString().split('T')[0];
  const prunedEntries = Object.entries(cache).filter(([date]) => date >= limitDateStr);
  return Object.fromEntries(prunedEntries);
};

export default function GameofTheDay() {
  const LeaguesWithoutAll = Object.values(League).filter((league) => league !== League.ALL);
  const currentDate = new Date();
  const [games, setGames] = useState<GameFormatted[]>([]);
  const [selectDate, setSelectDate] = useState<Date>(currentDate);
  const [selectLeagues, setSelectLeagues] = useState<League[]>(
    getCache<League[]>('leaguesSelected') || LeaguesWithoutAll,
  );
  const [userLeagues, setUserLeagues] = useState<League[]>(
    () => getCache<League[]>('leaguesSelected') || LeaguesWithoutAll,
  );
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>(() => getCache<string[]>('favoriteTeams') || []);
  // Add state for the filter slider
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  const [leaguesAvailable, setLeaguesAvailable] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const readonlyRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const [gamesSelected, setGamesSelected] = useState<GameFormatted[]>(
    () => getCache<GameFormatted[]>('gameSelected') || [],
  );

  const teamsOfTheDay = useMemo(() => {
    const teamsMap = new Map<string, { label: string; uniqueId: string; league: string }>();

    games.forEach((game) => {
      if (selectLeagues.includes(game.league as League)) {
        teamsMap.set(game.homeTeamId, {
          label: game.homeTeam,
          uniqueId: game.homeTeamId,
          league: game.league,
        });
        teamsMap.set(game.awayTeamId, {
          label: game.awayTeam,
          uniqueId: game.awayTeamId,
          league: game.league,
        });
      }
    });

    return Array.from(teamsMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [games, selectLeagues]);

  const [teamSelectedId, setTeamSelectedId] = useState<string>('');
  const gamesDayCache = useRef<{ [key: string]: GameFormatted[] }>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const ActionButtonRef = useRef<ActionButtonRef>(null);

  useEffect(() => {
    const updateFavorites = () => {
      setFavoriteTeams(getCache<string[]>('favoriteTeams') || []);
    };
    if (globalThis.window !== undefined) {
      globalThis.window.addEventListener('favoritesUpdated', updateFavorites);
      return () => globalThis.window.removeEventListener('favoritesUpdated', updateFavorites);
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
    const finished: GameFormatted[] = [];
    const scheduled: GameFormatted[] = [];

    relevantGames.forEach((game) => {
      const status = getGamesStatus(game);
      if (status === GameStatus.IN_PROGRESS && (!game.homeTeamScore || game.homeTeamScore === null)) {
        inProgress.push(game);
      } else if (status === GameStatus.FINAL || game.homeTeamScore != null) {
        finished.push(game);
      } else {
        scheduled.push(game);
      }
    });

    const roundToHour = windowWidth >= 768 && windowWidth < 1200;
    const scheduledGrouped = groupGamesByHour(scheduled, roundToHour);

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
    if (finished.length > 0) {
      groups.push({ hour: translateWord('ended'), games: sortGamesByFavorites(finished) });
    }

    return groups;
  }, [games, selectLeagues, teamSelectedId, windowWidth, activeFilter, favoriteTeams]);

  const getGamesFromApi = useCallback(async (dateToFetch: Date) => {
    const YYYYMMDD = new Date(dateToFetch).toISOString().split('T')[0];

    // Check cache first
    const cachedGames = gamesDayCache.current[YYYYMMDD];
    if (cachedGames) {
      const today = new Date().toISOString().split('T')[0];
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
          gamesToDisplay = combined.filter((game, index, self) => index === self.findIndex((t) => t._id === game._id));
        }
        setGames(gamesToDisplay);
      } else {
        setGames(gamesToDisplay);
      }
    }

    // Fetch from API if not in cache
    try {
      const gamesByHourData = await fetchGamesByHour(YYYYMMDD);
      const gamesOfTheDay = Object.values(gamesByHourData).flat();
      gamesDayCache.current[YYYYMMDD] = gamesOfTheDay;

      if (YYYYMMDD === new Date().toISOString().split('T')[0]) {
        const nextFetchedGames = await getNextGamesFromApi(dateToFetch);
        Object.entries(nextFetchedGames).forEach(([date, games]) => {
          gamesDayCache.current[date] = games;
        });
      }
      const pruned = pruneOldGamesCache({ ...(gamesDayCache.current || {}) });
      gamesDayCache.current = pruned;
      saveCache('gamesDay', pruned);
      setGames(gamesOfTheDay);
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
  }, []);

  const handleDateChange = useCallback(
    (startDate: Date, endDate: Date) => {
      readonlyRef.current = true;
      setSelectDate(startDate);
      const YYYYMMDD = new Date(startDate).toISOString().split('T')[0];
      if (!gamesDayCache.current[YYYYMMDD]) {
        setGames([]);
      }
      setIsLoading(true);

      getGamesFromApi(startDate).finally(() => {
        readonlyRef.current = false;
        setIsLoading(false);
      });
    },
    [getGamesFromApi],
  );

  const handleFilterChange = useCallback(
    (filter: string) => {
      setActiveFilter(filter);
      if (filter === 'ALL') {
        // Reset to all leagues and clear team selection
        setSelectLeagues(userLeagues);
        setTeamSelectedId('');
      } else if (filter === 'FAVORITES') {
        setSelectLeagues(LeaguesWithoutAll);
        setTeamSelectedId('');
      } else {
        // Specific league
        setSelectLeagues([filter as League]);
        setTeamSelectedId('');
      }
    },
    [LeaguesWithoutAll, userLeagues],
  );

  const handleTeamSelectionChange = useCallback((teamId: string | string[]) => {
    const finalTeamId = Array.isArray(teamId) ? teamId[0] : teamId;
    setTeamSelectedId(finalTeamId);
  }, []);

  const hasFavorites = useMemo(() => {
    return games.some((game) => favoriteTeams.includes(game.homeTeamId) || favoriteTeams.includes(game.awayTeamId));
  }, [games, favoriteTeams]);

  const displayFilters = useCallback(() => {
    return (
      <ThemedView>
        <div style={windowWidth > 768 ? { display: 'flex', flexDirection: 'row', width: '100%' } : { width: '100%' }}>
          <div style={{ width: '100%' }}>
            <Selector
              data={{
                i: randomNumber(999999),
                items: teamsOfTheDay as any,
                itemSelectedId: teamSelectedId,
                itemsSelectedIds: [],
              }}
              onItemSelectionChange={handleTeamSelectionChange}
              allowMultipleSelection={false}
              isClearable={true}
              placeholder={translateWord('filterTeams')}
            />
          </div>
        </div>
      </ThemedView>
    );
  }, [leaguesAvailable, selectLeagues, teamsOfTheDay, teamSelectedId, handleTeamSelectionChange, windowWidth]);

  const displayNoContent = useCallback(() => {
    if (isLoading) {
      return <LoadingView />;
    } else {
      return <NoResults />;
    }
  }, [isLoading]);

  const displaySmallDeviceContent = useCallback(() => {
    if (!games || games.length === 0) {
      return displayNoContent();
    }

    if (visibleGamesByHour.length === 0) return <NoResults />;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectDate);
    selected.setHours(0, 0, 0, 0);
    const isPast = selected < today;

    return (
      <ThemedView>
        {visibleGamesByHour.map(({ hour, games }, i) => {
          if (isPast) {
            return (
              <div key={hour} style={{ width: '100%', margin: '0 auto' }}>
                {games.map((game) => (
                  <CardLarge
                    key={game._id ?? randomNumber(999999)}
                    data={teamSelectedId ? { ...game, teamSelectedId } : game}
                    showDate={false}
                  />
                ))}
              </div>
            );
          }
          return (
            <div key={hour} style={{ width: '100%', margin: '0 auto' }}>
              <Accordion
                filter={hour}
                i={i}
                gamesFiltred={games}
                open={true}
                isCounted={false}
                disableToggle={false}
                gamesSelected={gamesSelected}
              />
            </div>
          );
        })}
      </ThemedView>
    );
  }, [games, displayNoContent, visibleGamesByHour, gamesSelected, selectDate, teamSelectedId]);

  const displayLargeDeviceHeader = useCallback(() => {
    if (visibleGamesByHour.length === 0) {
      return null;
    }
    const showSingleColumn = visibleGamesByHour.length <= 1 || teamSelectedId !== '';

    return (
      <div
        style={{
          backgroundColor: 'white',
          border: '1px solid black',
          width: showSingleColumn ? '50%' : '100%',
          margin: 'auto',
        }}
      >
        <table
          style={{
            tableLayout: 'fixed',
            width: '100%',
            margin: 'auto',
            borderCollapse: 'collapse',
          }}
        >
          <tbody>
            <tr>
              {visibleGamesByHour.map(({ hour }, index) => (
                <td
                  key={hour}
                  style={{
                    borderRight: index === visibleGamesByHour.length - 1 ? undefined : '1px solid black',
                  }}
                >
                  <div
                    style={{
                      padding: 15,
                      alignItems: 'center',
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    <ThemedText type="subtitle" style={{ color: 'black' }}>
                      {hour}
                    </ThemedText>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  }, [visibleGamesByHour, teamSelectedId]);

  const displayLargeDeviceContent = useCallback(() => {
    if (!games || games.length === 0) {
      return displayNoContent();
    }
    if (visibleGamesByHour.length === 0) return <NoResults />;

    const showSingleColumn = visibleGamesByHour.length <= 1 || teamSelectedId !== '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectDate);
    selected.setHours(0, 0, 0, 0);
    const isPast = selected < today;

    return (
      <ThemedView>
        <table
          style={{
            tableLayout: 'fixed',
            width: showSingleColumn ? '50%' : '100%',
            margin: 'auto',
          }}
        >
          <tbody>
            <tr>
              {visibleGamesByHour.map(({ hour, games }) => (
                <td key={hour} style={{ verticalAlign: 'top' }}>
                  {games.map((game) => {
                    const gameId = game._id ?? randomNumber(999999);
                    if (isPast) {
                      return (
                        <CardLarge
                          key={gameId}
                          data={teamSelectedId ? { ...game, teamSelectedId } : game}
                          showDate={false}
                          selected={false}
                        />
                      );
                    }
                    const isSelected = gamesSelected.some(
                      (gameSelect) =>
                        game.homeTeamId === gameSelect.homeTeamId && game.startTimeUTC === gameSelect.startTimeUTC,
                    );
                    return (
                      <CardLarge
                        key={gameId}
                        data={game}
                        numberSelected={1}
                        showButtons={true}
                        showDate={false}
                        onSelection={() => {}}
                        selected={isSelected}
                        disableSelection={true}
                      />
                    );
                  })}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </ThemedView>
    );
  }, [games, displayNoContent, visibleGamesByHour, teamSelectedId, gamesSelected, selectDate]);

  useEffect(() => {
    const updateLeagues = () => {
      const stored = getCache<League[]>('leaguesSelected');
      if (stored) setSelectLeagues(stored);
      if (stored) setUserLeagues(stored);
    };
    if (globalThis.window !== undefined) {
      globalThis.window.addEventListener('leaguesUpdated', updateLeagues);
      return () => globalThis.window.removeEventListener('leaguesUpdated', updateLeagues);
    }
  }, []);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    async function initializeGames() {
      fetchLeagues(setLeaguesAvailable);
      // restore persisted games cache (current day + next 10 days)
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
      const YYYYMMDD = new Date(selectDate).toISOString().split('T')[0];
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

  useFocusEffect(
    useCallback(() => {
      setGamesSelected(getCache<GameFormatted[]>('gameSelected') || []);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        ref={scrollViewRef}
        onScroll={(event) => ActionButtonRef.current?.handleScroll(event)}
        scrollEventThrottle={16}
      >
        <div style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <ThemedView>
            <div style={{ position: 'relative', zIndex: 20 }}>
              <SliderDatePicker onDateChange={(date) => handleDateChange(date, date)} selectDate={selectDate} />
              <FilterSlider
                selectedFilter={activeFilter}
                onFilterChange={handleFilterChange}
                hasFavorites={hasFavorites}
                availableLeagues={userLeagues}
              />
              {displayFilters()}
            </div>
            {windowWidth > 768 && displayLargeDeviceHeader()}
          </ThemedView>
        </div>
        <ThemedView>{windowWidth > 768 ? displayLargeDeviceContent() : displaySmallDeviceContent()}</ThemedView>
      </ScrollView>

      <ActionButton ref={ActionButtonRef} scrollViewRef={scrollViewRef} />
    </ThemedView>
  );
}
