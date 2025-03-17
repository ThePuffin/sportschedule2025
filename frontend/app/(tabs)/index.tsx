import { ThemedView } from '@/components/ThemedView';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
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
const EXPO_PUBLIC_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://sportschedule2025backend.onrender.com';

export default function GameofTheDay() {
  const getGamesFromApi = async (date): Promise<GameFormatted[]> => {
    const YYYYMMDD = new Date(date).toISOString().split('T')[0];

    try {
      const response = await fetch(`${EXPO_PUBLIC_API_BASE_URL}/games/date/${YYYYMMDD}`);
      const dayGames = await response.json();
      setGames(dayGames);
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
        <div style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
          <Loader></Loader>
        </div>
      );
    }
    return leagues.map((league, i) => {
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
    }
    fetchGames();
  }, []);

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
