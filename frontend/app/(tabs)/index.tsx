// import Selector from '@/components/Selector';
import { ThemedView } from '@/components/ThemedView';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Accordion from '../../components/Accordion';
import DateRangePicker from '../../components/DatePicker';
import Loader from '../../components/Loader';
import { League } from '../../constants/enum';
import { translateWord } from '../../utils/utils';

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
  const { width: windowWidth } = useWindowDimensions();
  width = windowWidth;
  const getGamesFromApi = async (date: Date): Promise<GameFormatted[] | undefined> => {
    const YYYYMMDD = new Date(date).toISOString().split('T')[0];
    if (Object.keys(gamesDay).length === 0) {
      const gamesDayString = localStorage.getItem('gamesDay');
      const localStorageGamesDay = gamesDayString ? JSON.parse(gamesDayString) : {};
      gamesDay = localStorageGamesDay || {};
    }
    if (gamesDay?.[YYYYMMDD]?.length) {
      setGames(gamesDay[YYYYMMDD]);
    }

    try {
      const gamesOfTheDay = await fetchGames(YYYYMMDD);
      setGames(gamesOfTheDay);
    } catch (error) {
      console.error(error);
      return;
    }
  };

  const currentDate = new Date();
  const [games, setGames] = useState<GameFormatted[]>([]);
  const [dateRange, setDateRange] = useState({ startDate: currentDate, endDate: currentDate });

  const handleDateChange = (startDate: Date, endDate: Date) => {
    setDateRange({ startDate, endDate });
    getGamesFromApi(startDate);
  };

  // const handleLeagueSelectionChange = (leagueSelectedId: string, i: number) => {
  //   console.log(`League selected: ${leagueSelectedId} at index ${i}`);
  // };

  const displaySelect = ({ league, leaguesAvailable, i, gamesFiltred }) => {
        // const data = {
    //   i: i,
    //   activeTeams: leaguesAvailable,
    //   itemsSelectedIds: [leaguesAvailable],
    //   itemSelectedId: leaguesAvailable[i],
    // };
    // return (
    //   <ThemedView>
    //     <Selector data={data} onItemSelectionChange={handleLeagueSelectionChange} />
    //     <p>the card</p>
    //   </ThemedView>
    // );
    return (
      <ThemedView>
        <Accordion key={i} open={i === 0} filter={league} i={i} gamesFiltred={gamesFiltred} isCounted={isCounted} />
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
    const leaguesAvailable = [League.ALL, ...new Set(games.map((game) => game.league).sort())];

    return leaguesAvailable.map((league, i: number) => {
      let gamesFiltred = [...games];
      if (league !== League.ALL) {
        gamesFiltred = gamesFiltred.filter((game) => game.league === league);
      }
      return <div key={league}>{displaySelect({ league, leaguesAvailable, i, gamesFiltred })}</div>;
    });
  };

  const displayAccordion = (leaguesAvailable) => {
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

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});
