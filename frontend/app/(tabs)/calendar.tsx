import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { readableDate } from '../../utils/date';
import { ScrollView } from 'react-native';
import React, { useEffect, useState } from 'react';
import Cards from '../../components/Cards';
import Selector from '../../components/Selector';

const teamsSelected = ['NHL-NJD', 'NBA-PHX', 'NBA-ATL'];

const getTeamsFromApi = async (): Promise<Team[]> => {
  try {
    const response = await fetch(`http://localhost:3000/teams`);
    return await response.json();
  } catch (error) {
    console.error(error);
  }
};

const getGamesFromApi = async (): Promise<GameFormatted[]> => {
  const now = new Date();
  const startDate = readableDate(now);
  const endDate = readableDate(new Date(now.setMonth(now.getMonth() + 1)));

  try {
    const response = await fetch(
      `http://localhost:3000/games/filter?startDate=${startDate}&endDate=${endDate}&teamSelectedIds=${teamsSelected.join(
        ','
      )}`
    );
    const games = await response.json();
    console.log(games);
    return games;
  } catch (error) {
    console.error(error);
    return;
  }
};

export default function Calendar() {
  const [games, setGames] = useState<GameFormatted[]>([]);
  const [teams, setTeams] = useState<TeamDocument[]>([]);
  const i = 0;

  const displayTeamSelector = () => {
    if (teams.length) {
      return teamsSelected.map((teamSelectedId, i) => {
        const data = { i, activeTeams: teams, teamsSelectedIds: teams, teamSelectedId };
        return (
          <td key={teamSelectedId}>
            <ThemedView>
              <Selector data={data} />
              {displayGamesCards(teamSelectedId)}
            </ThemedView>
          </td>
        );
      });
    }
  };

  const displayGamesCards = (teamSelectedId) => {
    const days = Object.keys(games);
    if (days.length) {
      return days.map((day) => {
        const game = games[day].find((game) => game.teamSelectedId === teamSelectedId);
        const gameId = game?._id || Math.random();
        return (
          <td key={gameId}>
            <ThemedView>
              <Cards data={game} showDate={true} />
            </ThemedView>
          </td>
        );
      });
    }
    return <ThemedText>page in progress</ThemedText>;
  };

  useEffect(() => {
    async function fetchTeams() {
      const teamsData = await getTeamsFromApi();
      setTeams(teamsData);
    }
    async function fetchGames() {
      const gamesData = await getGamesFromApi();
      setGames(gamesData);
    }
    fetchTeams();
    fetchGames();
  }, []);
  return (
    <ScrollView>
      <table style={{ tableLayout: 'fixed', width: '100%' }}>
        <tbody>
          <tr>{displayTeamSelector()}</tr>
        </tbody>
      </table>
    </ScrollView>
  );
}
