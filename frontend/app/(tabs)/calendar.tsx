import { ThemedView } from '@/components/ThemedView';
import { Button } from '@rneui/themed';
import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import Buttons from '../../components/Buttons';
import Cards from '../../components/Cards';
import Selector from '../../components/Selector';
import { readableDate } from '../../utils/date';
import { FilterGames, GameFormatted, Team } from '../../utils/types';
import { randomNumber } from '../../utils/utils';

export default function Calendar() {
  const [games, setGames] = useState<FilterGames>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsSelected, setTeamsSelected] = useState<string[]>([]);

  const getSelectedTeams = (allTeams) => {
    const selection = [];
    //TODO: get datas from storage
    if (!selection.length) {
      while (selection.length < 2) {
        const randomId = allTeams[randomNumber(allTeams.length) - 1]?.uniqueId;

        if (randomId && !selection.includes(randomId)) {
          selection.push(randomId);
        }
      }
    }
    setTeamsSelected(selection);
  };

  const getTeamsFromApi = async (): Promise<Team[]> => {
    try {
      const response = await fetch(`http://localhost:3000/teams`);
      const allTeams = await response.json();
      getSelectedTeams(allTeams);
      return allTeams;
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  const getGamesFromApi = async (): Promise<FilterGames> => {
    if (teamsSelected && teamsSelected.length !== 0) {
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
        return {};
      }
    }
    return {};
  };

  const handleTeamSelectionChange = (teamSelectedId: string, i: number) => {
    setTeamsSelected((prevTeamsSelected) => {
      const newTeamsSelected = [...prevTeamsSelected];
      newTeamsSelected[i] = teamSelectedId;
      return newTeamsSelected;
    });
  };

  const displayTeamSelector = () => {
    return teamsSelected.map((teamSelectedId, i) => {
      const data = { i, activeTeams: teams, teamsSelectedIds: teamsSelected, teamSelectedId };
      return (
        <td key={teamSelectedId}>
          <ThemedView>
            <Selector data={data} onTeamSelectionChange={handleTeamSelectionChange} />
            {displayGamesCards(teamSelectedId)}
          </ThemedView>
        </td>
      );
    });
  };

  const displayGamesCards = (teamSelectedId: string) => {
    if (games) {
      const days = Object.keys(games) || [];
      if (days.length) {
        return days.map((day: string) => {
          const game = games[day].find((game: GameFormatted) => game.teamSelectedId === teamSelectedId);
          if (game) {
            const gameId = game?._id ?? randomNumber(999999);
            return (
              <td key={gameId}>
                <ThemedView>
                  <Cards data={game} showDate={true} />
                </ThemedView>
              </td>
            );
          }
          return null;
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
    fetchTeams();
  }, []);

  useEffect(() => {
    if (teamsSelected.length > 0) {
      async function fetchGames() {
        const gamesData = await getGamesFromApi();
        setGames(gamesData);
      }
      fetchGames();
    }
  }, [teamsSelected]);

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
