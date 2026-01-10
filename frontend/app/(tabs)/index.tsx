import Cards from '@/components/Cards';
import NoResults from '@/components/NoResults';
import Selector from '@/components/Selector';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import Accordion from '../../components/Accordion';
import { ActionButton, ActionButtonRef } from '../../components/ActionButton';
import DateRangePicker from '../../components/DatePicker';
import LoadingView from '../../components/LoadingView';
import { League, timeDurationEnum } from '../../constants/enum';
import { fetchGamesByHour, fetchLeagues, getCache, saveCache } from '../../utils/fetchData';
import { GameFormatted } from '../../utils/types';
import { randomNumber } from '../../utils/utils';

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
  const newFetch: { [key: string]: GameFormatted[] } = {};
  for (let i = 0; i < 10; i++) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + i);
    const nextYYYYMMDD = nextDate.toISOString().split('T')[0];
    const gamesByHour = await fetchGamesByHour(nextYYYYMMDD);
    newFetch[nextYYYYMMDD] = Object.values(gamesByHour).flat();
  }
  // Return fetched days to caller so caller (component) can merge into its cache and persist
  return newFetch;
};

export default function GameofTheDay() {
  const LeaguesWithoutAll = Object.values(League).filter((league) => league !== League.ALL);
  const currentDate = new Date();
  const [games, setGames] = useState<GameFormatted[]>([]);
  const [selectDate, setSelectDate] = useState<Date>(currentDate);
  const [gamesFiltred, setGamesFiltred] = useState<GameFormatted[]>([]);
  const [league, setLeague] = useState<League>(League.ALL);
  const [selectLeagues, setSelectLeagues] = useState<League[]>(LeaguesWithoutAll);
  const [leaguesAvailable, setLeaguesAvailable] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const readonlyRef = useRef(false);
  const lastGamesUpdateRef = useRef<Date | null>(null);
  const hasInitializedRef = useRef(false);

  const [gamesSelected, setGamesSelected] = useState<GameFormatted[]>(
    () => getCache<GameFormatted[]>('gameSelected') || []
  );

  const teamsOfTheDay = useMemo(() => {
    const filtredTeamsAvailable = games
      .filter((game) => selectLeagues.includes(game.league as League))
      .map((game) => ({
        label: game.homeTeam,
        uniqueId: game.homeTeamId,
        league: game.league,
      }))
      .concat(
        games
          .filter((game) => selectLeagues.includes(game.league as League))
          .map((game) => ({
            label: game.awayTeam,
            uniqueId: game.awayTeamId,
            league: game.league,
          }))
      )
      .sort((a, b) => a.label.localeCompare(b.label));
    return Array.from(new Set(filtredTeamsAvailable));
  }, [games, selectLeagues]);

  const [teamSelectedId, setTeamSelectedId] = useState<string>('');
  const gamesDayCache = useRef<{ [key: string]: GameFormatted[] }>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const ActionButtonRef = useRef<ActionButtonRef>(null);

  const pruneOldGamesCache = (cache: { [key: string]: GameFormatted[] }) => {
    const today = new Date().toISOString().split('T')[0];
    const prunedEntries = Object.fromEntries(Object.entries(cache).filter(([date]) => date >= today)) as {
      [key: string]: GameFormatted[];
    };
    return prunedEntries;
  };

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const gamesByHour = useMemo(() => {
    const roundToHour = windowWidth >= 768 && windowWidth < 1200;
    const nowMinusThreeHour = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const validGames = games.filter((g) => new Date(g.startTimeUTC) >= nowMinusThreeHour);
    return groupGamesByHour(validGames, roundToHour);
  }, [games, windowWidth]);

  const visibleGamesByHour = useMemo(() => {
    const getStatusWeight = (games: GameFormatted[]) => {
      const now = new Date();
      let hasInProgress = false;
      let allEnded = true;

      for (const game of games) {
        const startTime = new Date(game.startTimeUTC);
        const duration = timeDurationEnum[game.league as keyof typeof timeDurationEnum] ?? 3;
        const endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + duration);

        if (now >= startTime && now <= endTime) {
          hasInProgress = true;
          allEnded = false;
        } else if (now < startTime) {
          allEnded = false;
        }
      }

      if (hasInProgress) return 0;
      if (!allEnded) return 1;
      return 2;
    };

    const groups = Object.keys(gamesByHour)
      .map((hour) => {
        const gamesInHour = gamesByHour[hour].filter(
          (game) =>
            selectLeagues.includes(game.league as League) &&
            (!teamSelectedId || game.homeTeamId === teamSelectedId || game.awayTeamId === teamSelectedId) &&
            game.awayTeamLogo &&
            game.homeTeamLogo
        );
        return { hour, games: gamesInHour };
      })
      .filter((group) => group.games.length > 0);

    groups.sort((a, b) => {
      const weightA = getStatusWeight(a.games);
      const weightB = getStatusWeight(b.games);

      if (weightA !== weightB) {
        return weightA - weightB;
      }

      const timeA = a.games[0]?.startTimeUTC;
      const timeB = b.games[0]?.startTimeUTC;
      if (timeA && timeB) {
        return new Date(timeA).getTime() - new Date(timeB).getTime();
      }
      return a.hour.localeCompare(b.hour);
    });

    return groups;
  }, [gamesByHour, selectLeagues, teamSelectedId]);

  const handleGames = useCallback(
    (gamesList: GameFormatted[]) => {
      setGames(gamesList);
      let filtered = gamesList;
      if (selectLeagues.length > 0) {
        filtered = filtered.filter((game) => selectLeagues.includes(game.league as League));
      }
      if (teamSelectedId) {
        filtered = filtered.filter((g) => g.homeTeamId === teamSelectedId || g.awayTeamId === teamSelectedId);
      }
      setGamesFiltred(filtered);
    },
    [selectLeagues, teamSelectedId]
  );

  const getGamesFromApi = useCallback(
    async (dateToFetch: Date) => {
      const YYYYMMDD = new Date(dateToFetch).toISOString().split('T')[0];

      // Check cache first
      const cachedGames = gamesDayCache.current[YYYYMMDD];
      if (cachedGames) {
        handleGames(cachedGames);
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
              ({ startTimeUTC = '' }) => new Date(startTimeUTC) >= nowMinusThreeHour
            );
            const combined = [...recentYesterdayGames, ...cachedGames];
            gamesToDisplay = combined.filter(
              (game, index, self) => index === self.findIndex((t) => t._id === game._id)
            );
          }
        }
        handleGames(gamesToDisplay);
        return;
      }

      // Fetch from API if not in cache
      try {
        const gamesByHourData = await fetchGamesByHour(YYYYMMDD);
        const gamesOfTheDay = Object.values(gamesByHourData).flat();
        gamesDayCache.current[YYYYMMDD] = gamesOfTheDay;
        // prune old entries and persist
        const pruned = pruneOldGamesCache({ ...(gamesDayCache.current || {}) });
        gamesDayCache.current = pruned;
        saveCache('gamesDay', pruned);
        handleGames(gamesOfTheDay);
      } catch (error) {
        console.error(error);
        gamesDayCache.current[YYYYMMDD] = [];
        const prunedEmpty = pruneOldGamesCache({ ...(gamesDayCache.current || {}) });
        gamesDayCache.current = prunedEmpty;
        saveCache('gamesDay', prunedEmpty);
        handleGames([]);
      }
    },
    [handleGames]
  );

  const handleDateChange = useCallback(
    (startDate: Date, endDate: Date) => {
      readonlyRef.current = true;
      setSelectDate(startDate);
      setIsLoading(true);

      getGamesFromApi(startDate).finally(() => {
        setGames((prevGames) => {
          // Filter games by selected leagues
          const gamesForLeagues = prevGames.filter((game) => selectLeagues.includes(game.league as League));

          // Check if selected team has any games on this date
          const teamHasGames =
            teamSelectedId &&
            gamesForLeagues.some((g) => g.homeTeamId === teamSelectedId || g.awayTeamId === teamSelectedId);

          if (teamHasGames && teamSelectedId) {
            // Keep team filter and update filtered games
            const filteredGames = gamesForLeagues.filter(
              (g) => g.homeTeamId === teamSelectedId || g.awayTeamId === teamSelectedId
            );
            setGamesFiltred(filteredGames);
          } else if (!teamHasGames && teamSelectedId) {
            // Reset team filter if no games for this team
            setTeamSelectedId('');
            setGamesFiltred(gamesForLeagues);
          }

          return prevGames;
        });

        readonlyRef.current = false;
        setIsLoading(false);
      });
    },
    [getGamesFromApi, selectLeagues, teamSelectedId]
  );

  const handleLeagueSelectionChange = useCallback(
    (leagueSelectedId: string | string[]) => {
      const nowMinusOneHour = new Date(Date.now() - 3 * 60 * 60 * 1000);
      setTeamSelectedId('');
      if (Array.isArray(leagueSelectedId)) {
        saveCache('leaguesSelected', leagueSelectedId);
        setSelectLeagues(leagueSelectedId as League[]);
        setGames((prevGames) => {
          const filteredGames = prevGames.filter(
            (game) =>
              leagueSelectedId.includes(game.league as string) && new Date(game.startTimeUTC || '') >= nowMinusOneHour
          );
          setGamesFiltred([...filteredGames]);
          return prevGames;
        });
      } else {
        saveCache('league', leagueSelectedId);
        setLeague(leagueSelectedId as League);
        setGames((prevGames) => {
          if (leagueSelectedId === League.ALL) {
            setGamesFiltred([...prevGames]);
          } else {
            const filteredGames = prevGames.filter((game) => game.league === leagueSelectedId);
            setGamesFiltred(filteredGames);
          }
          return prevGames;
        });
      }
    },
    [setTeamSelectedId, setSelectLeagues, setGames, setGamesFiltred, setLeague]
  );

  const handleTeamSelectionChange = useCallback(
    (teamId: string | string[]) => {
      const finalTeamId = Array.isArray(teamId) ? teamId[0] : teamId;
      setTeamSelectedId(finalTeamId);
      setGames((prevGames) => {
        const filteredGamesByLeague = prevGames.filter((game) => selectLeagues.includes(game.league as League));
        if (finalTeamId === '') {
          setGamesFiltred(filteredGamesByLeague);
        } else {
          const filteredGames = filteredGamesByLeague.filter(
            (g) => g.homeTeamId === finalTeamId || g.awayTeamId === finalTeamId
          );
          setGamesFiltred(filteredGames);
        }
        return prevGames;
      });
    },
    [selectLeagues]
  );

  const displayGamesCards = useCallback(
    (gamesToShow: GameFormatted[]) => {
      if (gamesToShow?.length === 0) {
        return <NoResults />;
      } else {
        return gamesToShow.map((game) => {
          if (game) {
            const gameId = game?._id ?? randomNumber(999999);

            const isSelected = gamesSelected.some(
              (gameSelect) => game.homeTeamId === gameSelect.homeTeamId && game.startTimeUTC === gameSelect.startTimeUTC
            );
            return (
              <Cards
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
          }
        });
      }
    },
    [gamesSelected]
  );

  const displayFilters = useCallback(() => {
    const leagues = leaguesAvailable.map((league: string) => {
      return { label: league, uniqueId: league, value: league };
    });
    const leaguesData = {
      i: 'leagues',
      items: leagues as any,
      itemsSelectedIds: selectLeagues,
      itemSelectedId: league,
    };

    return (
      <ThemedView>
        <div style={windowWidth > 768 ? { display: 'flex', flexDirection: 'row', width: '100%' } : { width: '100%' }}>
          <div style={{ width: windowWidth > 768 ? '50%' : '100%' }}>
            <Selector
              data={leaguesData as any}
              onItemSelectionChange={handleLeagueSelectionChange}
              allowMultipleSelection={true}
              isClearable={false}
            />
          </div>
          <div style={{ width: windowWidth > 768 ? '50%' : '100%' }}>
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
            />
          </div>
        </div>
      </ThemedView>
    );
  }, [
    leaguesAvailable,
    selectLeagues,
    league,
    teamsOfTheDay,
    teamSelectedId,
    handleLeagueSelectionChange,
    handleTeamSelectionChange,
    windowWidth,
  ]);

  const displayNoContent = useCallback(() => {
    if (isLoading) {
      return <LoadingView />;
    } else {
      return <NoResults />;
    }
  }, [isLoading]);

  const displaySmallDeviceContent = useCallback(() => {
    if (!games || games.length === 0 || leaguesAvailable.length === 0) {
      return displayNoContent();
    }

    if (visibleGamesByHour.length === 0) return <NoResults />;

    return (
      <ThemedView>
        {visibleGamesByHour.map(({ hour, games }, i) => {
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
  }, [games, leaguesAvailable, displayNoContent, visibleGamesByHour, gamesSelected]);

  const displayLargeDeviceHeader = useCallback(() => {
    if (
      !games ||
      games.length === 0 ||
      !leaguesAvailable ||
      leaguesAvailable.length === 0 ||
      visibleGamesByHour.length === 0
    ) {
      return null;
    }
    const showSingleColumn = visibleGamesByHour.length <= 1 || teamSelectedId !== '';

    return (
      <div style={{ backgroundColor: 'white', border: '1px solid black' }}>
        <table
          style={{
            tableLayout: 'fixed',
            width: showSingleColumn ? '50%' : '100%',
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
                    borderRight: index !== visibleGamesByHour.length - 1 ? '1px solid black' : undefined,
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
  }, [games, leaguesAvailable, visibleGamesByHour, teamSelectedId]);

  const displayLargeDeviceContent = useCallback(() => {
    if (!games || games.length === 0 || !leaguesAvailable || leaguesAvailable.length === 0) {
      return displayNoContent();
    }
    if (visibleGamesByHour.length === 0) return <NoResults />;

    const showSingleColumn = visibleGamesByHour.length <= 1 || teamSelectedId !== '';

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
                    const isSelected = gamesSelected.some(
                      (gameSelect) =>
                        game.homeTeamId === gameSelect.homeTeamId && game.startTimeUTC === gameSelect.startTimeUTC
                    );
                    return (
                      <Cards
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
  }, [games, leaguesAvailable, displayNoContent, visibleGamesByHour, teamSelectedId, gamesSelected]);

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
      const storedLeague = getCache<League>('league');
      const storedLeagues = getCache<string[]>('leagues');
      const storedLeaguesSelected = getCache<League[]>('leaguesSelected');

      if (storedLeagues) {
        setLeaguesAvailable(storedLeagues);
      }
      if (storedLeague) {
        setLeague(storedLeague as League);
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

        const now = new Date();
        if (!lastGamesUpdateRef.current || lastGamesUpdateRef.current.toDateString() !== now.toDateString()) {
          const nextFetch = await getNextGamesFromApi(selectDate);
          // merge, prune and persist fetched next days
          const merged = { ...(gamesDayCache.current || {}), ...(nextFetch || {}) };
          const mergedPruned = pruneOldGamesCache(merged);
          gamesDayCache.current = mergedPruned;
          saveCache('gamesDay', mergedPruned);
          lastGamesUpdateRef.current = now;
        }
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
    }, [])
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
              <DateRangePicker readonly={readonlyRef.current} onDateChange={handleDateChange} selectDate={selectDate} />
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
