import { ThemedView } from '@/components/ThemedView';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { League } from '../../constants/enum';
import Accordion from '../../components/Accordion';
import Loader from '../../components/Loader';
import DateRangePicker from '../../components/DatePicker';

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
  gameDate: string;
  teamSelectedId: string;
  show: boolean;
  selectedTeam: boolean;
  league: string;
  updateDate?: Date;
  venueTimezone?: string;
  timeStart?: string;
  startTimeUTC?: string;
}

const EXPO_PUBLIC_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
let gamesDay = {};
let lastGamesUpdate: Date;

const fetchGames = async (date: string): Promise<GameFormatted[]> => {
  const response = await fetch(`${EXPO_PUBLIC_API_BASE_URL}/games/date/${date}`);
  const dayGames = await response.json();
  gamesDay[date] = dayGames;
  return dayGames;
};

const getNextGamesFromApi = async (date: string): Promise<null> => {
  const newFetch = {};
  for (let i = 0; i < 7; i++) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + i);
    const nextYYYYMMDD = nextDate.toISOString().split('T')[0];
    newFetch[nextYYYYMMDD] = await fetchGames(nextYYYYMMDD);
  }
  gamesDay = { ...newFetch };
  return null;
};

export default function GameofTheDay() {
  const getGamesFromApi = async (date): Promise<GameFormatted[]> => {
    const YYYYMMDD = new Date(date).toISOString().split('T')[0];
    if (gamesDay[YYYYMMDD]?.length) {
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
  const leagues = Object.keys(League)
    .filter((item) => {
      return isNaN(Number(item));
    })
    .sort();

  const displayContent = () => {
    if (!games || games.length === 0) {
      return (
        <View style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
          <Loader />
        </View>
      );
    }
    const leaguesAvailable = ['ALL',...new Set(games.map((game) => game.league))];
    return leaguesAvailable.map((league, i) => {
      let gamesFiltred = [...games];
      if (league !== League.ALL) {
        gamesFiltred = gamesFiltred.filter((game) => game.league === league);
      }
      return <Accordion key={i} league={league} i={i} gamesFiltred={gamesFiltred} />;
    });
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
        <ThemedView>{displayContent()}</ThemedView>
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
