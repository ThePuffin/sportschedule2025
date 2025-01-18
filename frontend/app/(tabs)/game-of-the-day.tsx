import { Collapsible } from '@/components/Collapsible';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import Cards from '../../components/Cards';

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

export default function gameOfTheDay() {
  const [games, setGames] = useState<GameFormatted[]>([]);
  const makeCards = () => {
    if (!games) {
      return <ThemedText>There are no games today</ThemedText>;
    }
    if (games.length) {
      return games.map((game) => {
        const gameId = game?._id || Math.random();
        return <Cards key={gameId} data={game} />;
      });
    }
    return <ThemedText>Wait for it ....</ThemedText>;
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
        <ThemedView>
          <Collapsible title="click me">
            <ThemedText>click</ThemedText>
          </Collapsible>
          {makeCards()}
        </ThemedView>
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
