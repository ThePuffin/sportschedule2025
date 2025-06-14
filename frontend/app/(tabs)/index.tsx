import Cards from '@/components/Cards';
import Selector from '@/components/Selector';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React, { useEffect, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import Accordion from '../../components/Accordion';
import DateRangePicker from '../../components/DatePicker';
import Loader from '../../components/Loader';
import { League } from '../../constants/enum';
import { randomNumber, translateWord } from '../../utils/utils';

interface GameFormatted {
  _id: string;
  _v: number;
  uniqueId: string;
  awayTeamId: string;
  awayTeam: string;
  awayTeamShort: string;
  homeTeamId: string;
  homeTeam: string;
  homeTeamShort: string;
  arenaName: string;
  placeName: string;
  gameDate: string;
  teamSelectedId: string;
  show: boolean;
  selectedTeam: boolean;
  league: string;
  updateDate?: Date;
  venueTimezone?: string;
  isActive?: boolean;
  startTimeUTC?: string;
  awayTeamLogo?: string;
  homeTeamLogo?: string;
  color?: string;
  backgroundColor?: string;
}

let width: number;
const EXPO_PUBLIC_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://sportschedule2025backend.onrender.com';
let gamesDay: { [key: string]: GameFormatted[] } = {};
let lastGamesUpdate: Date;
const isCounted = true;

const fetchGames = async (date: string): Promise<GameFormatted[]> => {
  try {
    date = date || new Date().toISOString().split('T')[0];
    const response = await fetch(`${EXPO_PUBLIC_API_BASE_URL}/games/date/${date}`);
    const dayGames = await response.json();
    gamesDay[date] = dayGames;
    return dayGames;
  } catch (error) {
    console.error(`Error fetching games for date ${date}:`, error);
    return [];
  }
};

const getNextGamesFromApi = async (date: Date): Promise<null> => {
  const newFetch: { [key: string]: GameFormatted[] } = {};
  for (let i = 0; i < 10; i++) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + i);
    const nextYYYYMMDD = nextDate.toISOString().split('T')[0];
    newFetch[nextYYYYMMDD] = await fetchGames(nextYYYYMMDD);
  }
  gamesDay = { ...newFetch };
  localStorage.setItem('gamesDay', JSON.stringify(gamesDay));
  return null;
};

export default function GameofTheDay() {
  const currentDate = new Date();
  const [games, setGames] = useState<GameFormatted[]>([]);
  const [dateRange, setDateRange] = useState({ startDate: currentDate, endDate: currentDate });
  const [gamesFiltred, setGamesFiltred] = useState<GameFormatted[]>([]);
  const [league, setLeague] = useState(League.ALL);

  const { width: windowWidth } = useWindowDimensions();
  width = windowWidth;

  const handleGames = (gamesDayExists: GameFormatted[]) => {
    const storedLeague = localStorage.getItem('league');
    const leagueFromStorage = storedLeague ? (storedLeague as League) : League.ALL;
    let gamesToDisplay: GameFormatted[] = gamesDayExists;
    setGames(gamesDayExists);
    if (leagueFromStorage !== League.ALL) {
      gamesToDisplay = gamesDayExists.filter((game) => game.league === league);
      console.log(gamesToDisplay);
    }
    setGamesFiltred(gamesToDisplay);
    displayGamesCards(gamesToDisplay, leagueFromStorage);
  };

  const getGamesFromApi = async (date: Date, storedLeague?: string): Promise<GameFormatted[] | undefined> => {
    const YYYYMMDD = new Date(date).toISOString().split('T')[0];
    if (Object.keys(gamesDay).length === 0) {
      const gamesDayString = localStorage.getItem('gamesDay');
      const localStorageGamesDay = gamesDayString ? JSON.parse(gamesDayString) : {};
      gamesDay = localStorageGamesDay || {};
    }
    if (gamesDay?.[YYYYMMDD]?.length) {
      handleGames(gamesDay[YYYYMMDD]);
    }

    try {
      const gamesOfTheDay = await fetchGames(YYYYMMDD);
      handleGames(gamesOfTheDay);
    } catch (error) {
      console.error(error);
      return;
    }
  };

  const handleDateChange = (startDate: Date, endDate: Date) => {
    setDateRange({ startDate, endDate });
    getGamesFromApi(startDate);
  };

  const handleLeagueSelectionChange = (leagueSelectedId: string, i: number) => {
    localStorage.setItem('league', leagueSelectedId);
    setLeague(leagueSelectedId as League);
    if (leagueSelectedId === League.ALL) {
      setGamesFiltred([...games]);
    } else {
      const filteredGames = games.filter((game) => game.league === leagueSelectedId);
      setGamesFiltred(filteredGames);
    }
  };

  const displayGamesCards = (gamesToShow: GameFormatted[], league = League.ALL) => {
    if (gamesToShow?.length === 0) {
      return <ThemedText>{translateWord('noResults')}</ThemedText>;
    } else {
      return gamesToShow.map((game) => {
        if (game) {
          const gameId = game?._id ?? randomNumber(999999);
          return (
            <Cards key={gameId} data={game} numberSelected={1} showDate={true} onSelection={() => {}} selected={true} />
          );
        }
      });
    }
  };
  const displaySelect = () => {
    const leaguesAvailable = Object.values(League);

    const leagues = leaguesAvailable.map((league: string) => {
      return { label: league, uniqueId: league, value: league };
    });
    const data = {
      i: 0,
      items: leagues,
      itemsSelectedIds: [league],
      itemSelectedId: league,
    };

    const displayGames = league !== League.ALL ? gamesFiltred : games;
    return (
      <ThemedView>
        <Selector data={data} onItemSelectionChange={handleLeagueSelectionChange} />
        {displayGamesCards(displayGames, league)}
      </ThemedView>
    );
  };

  const displayNoContent = () => {
    return (
      <View style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
        <Loader />
      </View>
    );
  };

  const displaySmallDeviceContent = () => {
    if (!games || games.length === 0) {
      return displayNoContent();
    }

    return <div>{displaySelect()}</div>;
  };

  const displayAccordion = (leaguesAvailable: string[]) => {
    return leaguesAvailable.map((league, i: number) => {
      let gamesFiltred = [...games];
      if (league !== League.ALL) {
        gamesFiltred = gamesFiltred.filter((game) => game.league === league);
      }
      let translatedLeague = league;
      if (league === League.ALL) {
        translatedLeague = translateWord('translatedLeague');
      }
      return (
        <td key={league} style={{ verticalAlign: 'baseline' }}>
          <Accordion filter={translatedLeague} i={i} gamesFiltred={gamesFiltred} open={true} isCounted={isCounted} />
        </td>
      );
    });
  };

  const displayLargeDeviceContent = () => {
    if (!games || games.length === 0) {
      return displayNoContent();
    }
    const leaguesAvailable = [...new Set(games.map((game) => game.league))];
    if (leaguesAvailable.length > 1) {
      leaguesAvailable.unshift('ALL');
    }
    return (
      <table style={{ tableLayout: 'fixed', width: leaguesAvailable.length > 1 ? '100%' : '50%', margin: 'auto' }}>
        <tbody>
          <tr>{displayAccordion(leaguesAvailable)}</tr>
        </tbody>
      </table>
    );
  };

  useEffect(() => {
    async function fetchGames() {
      const storedLeague = localStorage.getItem('league');

      if (storedLeague) {
        await setLeague(storedLeague as League);
      }
      await getGamesFromApi(dateRange.startDate);
      if (!lastGamesUpdate || lastGamesUpdate.toDateString() !== new Date().toDateString()) {
        await getNextGamesFromApi(dateRange.startDate);
        lastGamesUpdate = new Date();
      }
    }
    fetchGames();
  }, [dateRange.startDate]);

  return (
    <>
      <DateRangePicker dateRange={dateRange} onDateChange={handleDateChange} noEnd={true} />
      <ScrollView>
        <ThemedView>{width > 768 ? displayLargeDeviceContent() : displaySmallDeviceContent()}</ThemedView>
      </ScrollView>
    </>
  );
}
