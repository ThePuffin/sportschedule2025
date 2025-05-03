import { ThemedView } from '@/components/ThemedView';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { League } from '../../constants/enum';
import Accordion from '../../components/Accordion';
import Loader from '../../components/Loader';
import DateRangePicker from '../../components/DatePicker';
import { translateLeagueAll } from '../../utils/utils';

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
let gamesDay = {};
let lastGamesUpdate: Date;

const fetchGames = async (date: string): Promise<GameFormatted[]> => {
  try {
    const response = await fetch(`${EXPO_PUBLIC_API_BASE_URL}/games/date/${date}`);
    const dayGames = await response.json();
    gamesDay[date] = dayGames;
    return dayGames;
  } catch (error) {
    console.error(`Error fetching games for date ${date}:`, error);
    return [];
  }
};

const getNextGamesFromApi = async (date: string): Promise<null> => {
  const newFetch = {};
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
  const getGamesFromApi = async (date): Promise<GameFormatted[]> => {
    const YYYYMMDD = new Date(date).toISOString().split('T')[0];
    if (Object.keys(gamesDay).length === 0) {
      const localStorageGamesDay = JSON.parse(localStorage.getItem('gamesDay'));
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

  const handleDateChange = (startDate, endDate) => {
    setDateRange({ startDate, endDate });
    getGamesFromApi(startDate);
  };

  const displayAccordion = ({ league, i, gamesFiltred }) => {
    return <Accordion key={i} league={league} i={i} gamesFiltred={gamesFiltred} />;
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

    return leaguesAvailable.map((league, i) => {
      let gamesFiltred = [...games];
      if (league !== League.ALL) {
        gamesFiltred = gamesFiltred.filter((game) => game.league === league);
      }
      return (
        <div key={league} style={{ margin: 'auto', width: '90%' }}>
          {displayAccordion({ league, i, gamesFiltred })}
        </div>
      );
    });
  };

  const displayAccoridon = (leaguesAvailable) => {
    return leaguesAvailable.map((league, i) => {
      let gamesFiltred = [...games];
      if (league !== League.ALL) {
        gamesFiltred = gamesFiltred.filter((game) => game.league === league);
      }
      let translatedLeague = league;
      if (league === League.ALL) {
        translatedLeague = translateLeagueAll();
      }
      return (
        <td key={league} style={{ verticalAlign: 'baseline' }}>
          <Accordion league={translatedLeague} i={i} gamesFiltred={gamesFiltred} open={true} />
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
          <tr>{displayAccoridon(leaguesAvailable)}</tr>
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
