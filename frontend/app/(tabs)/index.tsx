import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { League } from '../../constants/enum.ts';
import Accordion from '../../components/Accordion';

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

const getGamesFromApi = async (): Promise<GameFormatted[]> => {
  const now = new Date();
  const YYYYMMDD = now.toISOString().split('T')[0];

  try {
    const response = await fetch(`http://localhost:3000/games/date/${YYYYMMDD}`);
    const todayGames = await response.json();

    return todayGames;
  } catch (error) {
    console.error(error);
    return;
  }
};

export default function GameofTheDay() {
  const [games, setGames] = useState<GameFormatted[]>([]);
  const leagues = Object.keys(League)
    .filter((item) => {
      return isNaN(Number(item));
    })
    .sort();

  const displayContent = () => {
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
      const gamesData = await getGamesFromApi();
      setGames(gamesData);
    }
    fetchGames();
  }, []);

  return (
    <>
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
