import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { League } from '../../constants/enum.ts';
import Cards from '../../components/Cards';
import { ListItem } from '@rneui/themed';

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
  const [expanded, setExpanded] = useState({});
  const [games, setGames] = useState<GameFormatted[]>([]);
  const leagues = Object.keys(League)
    .filter((item) => {
      return isNaN(Number(item));
    })
    .sort();
  if (Object.entries(expanded).length === 0) {
    leagues.forEach((league, i) => {
      expanded[league] = i === 0;
    });
    setExpanded(expanded);
  }

  // TODO: create component accordion
  const displayContent = () => {
    return leagues.map((league, i) => {
      return (
        <ListItem.Accordion
          content={
            <>
              <ListItem.Content>
                <ListItem.Title>{league}</ListItem.Title>
              </ListItem.Content>
            </>
          }
          isExpanded={expanded[league]}
          onPress={() => {
            expanded[league] = !expanded[league];
            // setExpanded(!expanded);
          }}
        >
          {makeCards(league)}
        </ListItem.Accordion>
      );
    });
  };
  const makeCards = (league) => {
    let gamesToShow = [...games];
    if (league !== League.ALL) {
      gamesToShow = gamesToShow.filter((game) => game.league === league);
    }

    if (!gamesToShow || !gamesToShow.length) {
      return <ThemedText>There are no games today</ThemedText>;
    }
    if (gamesToShow.length) {
      return gamesToShow.map((game) => {
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
