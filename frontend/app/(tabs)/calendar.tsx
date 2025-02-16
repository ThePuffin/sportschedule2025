import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { readableDate } from '../../utils/date';
import { ScrollView } from 'react-native';
import React, { useEffect, useState } from 'react';
import Cards from '../../components/Cards';
import Selector from '../../components/Selector';
import Buttons from '../../components/Buttons';
import { Button } from '@rneui/themed';

const teamsSelected = ['NHL-NJD', 'NHL-CGY', 'NBA-PHX', 'MLB-ATL'];

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
    return await response.json();
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
  };

  const displayGamesCards = (teamSelectedId) => {
    if (games) {
      const days = Object.keys(games) || [];
      if (days.length) {
        return days.map((day) => {
          const game = games[day].find((game) => game.teamSelectedId === teamSelectedId);
          if (game) {
            const gameId = game?._id || Math.random();
            return (
              <td key={gameId}>
                <ThemedView>
                  <Cards data={game} showDate={true} />
                </ThemedView>
              </td>
            );
          }
        });
      }
    }
    return <Button title="Solid" disabled={true} type="solid" loading />;
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
      <Buttons />
      <table style={{ tableLayout: 'fixed', width: '100%' }}>
        <tbody>
          <tr>{displayTeamSelector()}</tr>
        </tbody>
      </table>
    </ScrollView>
  );
}
