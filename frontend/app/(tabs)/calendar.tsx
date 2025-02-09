import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { readableDate } from '../../utils/date';
import { ScrollView, StyleSheet } from 'react-native';
import React, { useEffect, useState } from 'react';
import Cards from '../../components/Cards';

const teams = ['NHL-NJD', 'NBA-PHX'];

const getGamesFromApi = async (): Promise<GameFormatted[]> => {
  const now = new Date();
  const startDate = readableDate(now);
  const endDate = readableDate(new Date(now.setMonth(now.getMonth() + 1)));

  try {
    const response = await fetch(
      `http://localhost:3000/games/filter?startDate=${startDate}&endDate=${endDate}&teamSelectedIds=${teams.join(',')}`
    );
    const games = await response.json();

    return games;
  } catch (error) {
    console.error(error);
    return;
  }
};

export default function Calendar() {
  const [games, setGames] = useState<GameFormatted[]>([]);

  const displayContent = () => {
    const days = Object.keys(games);
    if (days.length) {
      return days.map((day) => {
        const game = games[day][0];
        const gameId = game?._id || Math.random();
        return <Cards key={gameId} data={game} showDate={true} />;
      });
    }
    return <ThemedText>page in progress</ThemedText>;
  };

  useEffect(() => {
    async function fetchGames() {
      const gamesData = await getGamesFromApi();
      console.log({ gamesData });

      setGames(gamesData);
    }
    fetchGames();
  }, []);
  return (
    <ScrollView>
      <ThemedView>
        <ThemedView>{displayContent()}</ThemedView>
      </ThemedView>
    </ScrollView>
  );
}
