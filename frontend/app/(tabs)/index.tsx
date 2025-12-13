import Cards from '@/components/Cards';
import Selector from '@/components/Selector';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import Accordion from '../../components/Accordion';
import DateRangePicker from '../../components/DatePicker';
import LoadingView from '../../components/LoadingView';
import { ScrollToTopButton, ScrollToTopButtonRef } from '../../components/ScrollToTopButton';
import { League } from '../../constants/enum';
import { fetchLeagues, getCache, saveCache } from '../../utils/fetchData';
import { GameFormatted } from '../../utils/types';
import { randomNumber, translateWord } from '../../utils/utils';

const EXPO_PUBLIC_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://sportschedule2025backend.onrender.com';

const fetchGames = async (date: string): Promise<GameFormatted[]> => {
  try {
    date = date || new Date().toISOString().split('T')[0];
    const response = await fetch(`${EXPO_PUBLIC_API_BASE_URL}/games/date/${date}`);
    const dayGames = await response.json();
    return dayGames;
  } catch (error) {
    console.error(`Error fetching games for date ${date}:`, error);
    return [];
  }
};

const getNextGamesFromApi = async (date: Date): Promise<{ [key: string]: GameFormatted[] }> => {
  const newFetch: { [key: string]: GameFormatted[] } = {};
  for (let i = 0; i < 10; i++) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + i);
    const nextYYYYMMDD = nextDate.toISOString().split('T')[0];
    newFetch[nextYYYYMMDD] = await fetchGames(nextYYYYMMDD);
  }
  saveCache('gamesDay', newFetch);
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

  const teamsOfTheDay = useMemo(() => {
    const filtredTeamsAvailable = games
      .filter((game) => selectLeagues.includes(game.league as League))
      .map((game) => ({
        label: game.homeTeam,
        uniqueId: game.homeTeamId,
      }))
      .concat(
        games
          .filter((game) => selectLeagues.includes(game.league as League))
          .map((game) => ({
            label: game.awayTeam,
            uniqueId: game.awayTeamId,
          }))
      );
    return Array.from(new Set(filtredTeamsAvailable));
  }, [games, selectLeagues]);

  const [teamSelectedId, setTeamSelectedId] = useState<string>('');
  const gamesDayCache = useRef<{ [key: string]: GameFormatted[] }>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollToTopButtonRef = useRef<ScrollToTopButtonRef>(null);

  const { width: windowWidth } = useWindowDimensions();

  const handleGames = useCallback((gamesDayExists: GameFormatted[]) => {
    const nowMinusThreeHour = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const storedLeaguesSelected = getCache<League[]>('leaguesSelected');
    let gamesToDisplay: GameFormatted[] = gamesDayExists.filter(
      ({ startTimeUTC = '' }) => new Date(startTimeUTC) >= nowMinusThreeHour
    );

    setGames(gamesDayExists);

    if (storedLeaguesSelected) {
      const leaguesFromStorage = storedLeaguesSelected ?? LeaguesWithoutAll;
      if (leaguesFromStorage !== LeaguesWithoutAll) {
        gamesToDisplay = gamesToDisplay.filter((game) => leaguesFromStorage.includes(game.league as League));
      }
    } else {
      const storedLeague = getCache<League>('league');
      const leagueFromStorage = storedLeague ?? League.ALL;
      if (leagueFromStorage !== League.ALL) {
        gamesToDisplay = gamesDayExists.filter((game) => game.league === leagueFromStorage);
      }
      if (gamesToDisplay.length === 0) {
        setLeague(League.ALL);
        saveCache('league', League.ALL);
        gamesToDisplay = gamesDayExists;
      }
    }
    setGamesFiltred(gamesToDisplay);
  }, []);

  const getGamesFromApi = useCallback(
    async (dateToFetch: Date) => {
      const YYYYMMDD = new Date(dateToFetch).toISOString().split('T')[0];

      // Check cache first
      const cachedGames = gamesDayCache.current[YYYYMMDD];
      if (cachedGames) {
        handleGames(cachedGames);
        return;
      }

      // Fetch from API if not in cache
      try {
        const gamesOfTheDay = await fetchGames(YYYYMMDD);
        gamesDayCache.current[YYYYMMDD] = gamesOfTheDay;
        handleGames(gamesOfTheDay);
      } catch (error) {
        console.error(error);
        gamesDayCache.current[YYYYMMDD] = [];
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
        // Check if the currently selected team has games on the new date
        const YYYYMMDD = new Date(startDate).toISOString().split('T')[0];
        const gamesForDate = gamesDayCache.current[YYYYMMDD] || [];

        setGames((prevGames) => {
          // Filter games by selected leagues
          const gamesForLeagues = prevGames.filter((game) => selectLeagues.includes(game.league as League));

          // Check if selected team has any games on this date
          const teamHasGames =
            teamSelectedId &&
            gamesForLeagues.some((g) => g.homeTeamId === teamSelectedId || g.awayTeamId === teamSelectedId);

          if (!teamHasGames && teamSelectedId) {
            // Reset team filter if no games for this team
            setTeamSelectedId('');
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
      const nowMinusOneHour = new Date(new Date().getTime() - 3 * 60 * 60 * 1000);
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

  const displayGamesCards = useCallback((gamesToShow: GameFormatted[]) => {
    if (gamesToShow?.length === 0) {
      return <ThemedText>{translateWord('noResults')}</ThemedText>;
    } else {
      return gamesToShow.map((game) => {
        if (game) {
          const gameId = game?._id ?? randomNumber(999999);
          return (
            <Cards
              key={gameId}
              data={game}
              numberSelected={1}
              showButtons={true}
              showDate={false}
              onSelection={() => {}}
              selected={true}
            />
          );
        }
      });
    }
  }, []);

  const displaySelect = useCallback(() => {
    const leagues = leaguesAvailable.map((league: string) => {
      return { label: league, uniqueId: league, value: league };
    });
    const leaguesData = {
      i: 0,
      items: leagues as any,
      itemsSelectedIds: selectLeagues,
      itemSelectedId: league,
    };

    return (
      <ThemedView>
        <Selector
          data={leaguesData as any}
          onItemSelectionChange={handleLeagueSelectionChange}
          allowMultipleSelection={true}
        />
        <Selector
          data={{
            i: 1,
            items: teamsOfTheDay as any,
            itemSelectedId: teamSelectedId,
            itemsSelectedIds: [],
          }}
          onItemSelectionChange={handleTeamSelectionChange}
          allowMultipleSelection={false}
        />
        {displayGamesCards(gamesFiltred)}
      </ThemedView>
    );
  }, [
    leaguesAvailable,
    selectLeagues,
    league,
    teamsOfTheDay,
    teamSelectedId,
    gamesFiltred,
    handleLeagueSelectionChange,
    handleTeamSelectionChange,
    displayGamesCards,
  ]);

  const displayNoContent = useCallback(() => {
    if (isLoading) {
      return <LoadingView />;
    } else {
      return <ThemedText>{translateWord('noResults')}</ThemedText>;
    }
  }, [isLoading]);

  const displaySmallDeviceContent = useCallback(() => {
    if (!games || games.length === 0 || leaguesAvailable.length === 0) {
      return displayNoContent();
    }
    return <div>{displaySelect()}</div>;
  }, [games, leaguesAvailable, displayNoContent, displaySelect]);

  const displayAccordion = useCallback(() => {
    return leaguesAvailable.map((league, i) => {
      let gamesFiltred: GameFormatted[] = [...games];
      if (league !== League.ALL) {
        gamesFiltred = gamesFiltred.filter((game) => game.league === league && game.awayTeamLogo && game.homeTeamLogo);
      }

      if (teamSelectedId) {
        gamesFiltred = gamesFiltred.filter((g) => g.homeTeamId === teamSelectedId || g.awayTeamId === teamSelectedId);
      }

      let translatedLeague = league;
      if (league === League.ALL) {
        translatedLeague = translateWord('all');
      }
      if (gamesFiltred.length > 0) {
        return (
          <td key={league} style={{ verticalAlign: 'baseline' }}>
            <Accordion filter={translatedLeague} i={i} gamesFiltred={gamesFiltred} open={true} isCounted={false} />
          </td>
        );
      }
    });
  }, [leaguesAvailable, games, teamSelectedId]);

  const displayLargeDeviceContent = useCallback(() => {
    if (!games || games.length === 0 || !leaguesAvailable || leaguesAvailable.length === 0) {
      return displayNoContent();
    }
    const leaguesNumber = Array.from(new Set(games.map((game) => game.league))).length || 0;
    const showSingleColumn = leaguesNumber === 1 || teamSelectedId !== '';

    return (
      <ThemedView>
        <Selector
          data={{
            i: 1,
            items: teamsOfTheDay as any,
            itemSelectedId: teamSelectedId,
            itemsSelectedIds: [],
          }}
          onItemSelectionChange={handleTeamSelectionChange}
          allowMultipleSelection={false}
        />
        <table style={{ tableLayout: 'fixed', width: showSingleColumn ? '50%' : '100%', margin: 'auto' }}>
          <tbody>
            <tr>{displayAccordion()}</tr>
          </tbody>
        </table>
      </ThemedView>
    );
  }, [
    games,
    leaguesAvailable,
    displayNoContent,
    displayAccordion,
    teamsOfTheDay,
    teamSelectedId,
    handleTeamSelectionChange,
  ]);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    async function initializeGames() {
      fetchLeagues(setLeaguesAvailable);
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

      setIsLoading(true);
      try {
        await getGamesFromApi(selectDate);

        const now = new Date();
        if (!lastGamesUpdateRef.current || lastGamesUpdateRef.current.toDateString() !== now.toDateString()) {
          await getNextGamesFromApi(selectDate);
          lastGamesUpdateRef.current = now;
        }
      } finally {
        setIsLoading(false);
      }
    }

    initializeGames();
  }, []); // Only run once on mount

  return (
    <ThemedView style={{ flex: 1 }}>
      <DateRangePicker readonly={readonlyRef.current} onDateChange={handleDateChange} selectDate={selectDate} />
      <ScrollView
        ref={scrollViewRef}
        onScroll={(event) => scrollToTopButtonRef.current?.handleScroll(event)}
        scrollEventThrottle={16}
      >
        <ThemedView>{windowWidth > 768 ? displayLargeDeviceContent() : displaySmallDeviceContent()}</ThemedView>
      </ScrollView>
      <ScrollToTopButton ref={scrollToTopButtonRef} scrollViewRef={scrollViewRef} />
    </ThemedView>
  );
}
