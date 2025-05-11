import Selector from '@/components/Selector';
import { ThemedView } from '@/components/ThemedView';
import { getRandomTeamId, randomNumber } from '@/utils/utils';
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Cards from '../../components/Cards';
import Loader from '../../components/Loader';
import { FilterGames, Team } from '../../utils/types';
const EXPO_PUBLIC_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://sportschedule2025backend.onrender.com';

export default function Schedule() {
  const [games, setGames] = useState<FilterGames>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamSelected, setTeamSelected] = useState<string>('');

  const getSelectedTeams = (allTeams: []) => {
    let selection = localStorage.getItem('teamSelected') || '';
    if (selection.length === 0) {
      selection = getRandomTeamId(allTeams);
    }
    storeTeamSelected(selection);
  };

  const getStoredData = () => {
    const selection = localStorage.getItem('teamSelected') ?? '';
    if (selection) {
      storeTeamSelected(selection);

      const gamesData = localStorage.getItem('gamesData');
      if (gamesData) {
        setGames(JSON.parse(gamesData));
      }
    } else {
      setTeamSelected(selection);
    }
  };

  const getTeamsFromApi = async (): Promise<Team[]> => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_API_BASE_URL}/teams`);
      const allTeams = await response.json();
      getSelectedTeams(allTeams);

      return allTeams;
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  const handleTeamSelectionChange = (teamSelectedId: string, i: number) => {
    storeTeamSelected(teamSelectedId);
  };

  const displayTeamSelector = () => {
    const data = {
      i: randomNumber(999999),
      activeTeams: teams,
      teamsSelectedIds: [teamSelected],
      teamSelectedId: teamSelected,
    };
    return (
      <td key={`${teamSelected}-${teamSelected.length}`}>
        <ThemedView>
          <Selector data={data} onTeamSelectionChange={handleTeamSelectionChange} />
          {displayGamesCards(teamSelected)}
        </ThemedView>
      </td>
    );
  };

  const displayGamesCards = (teamSelectedId: string) => {
    if (games) {
      const days = Object.keys(games) || [];
      if (days.length) {
        return days.map((day: string) => {
          const game = games[day].find((game) => game.teamSelectedId === teamSelectedId);
          if (game) {
            const gameId = game?._id ?? randomNumber(999999);
            const isSelected = false;
            return (
              <td key={gameId}>
                <ThemedView>
                  <Cards data={game} numberSelected={1} showDate={true} selected={isSelected} />
                </ThemedView>
              </td>
            );
          }
          return null;
        });
      }
    }
    return <Loader />;
  };

  const getGamesFromApi = async (): Promise<FilterGames> => {
    if (teamSelected && teamSelected.length !== 0) {
      try {
        const response = await fetch(`${EXPO_PUBLIC_API_BASE_URL}/games/team/${teamSelected}`);

        const gamesData = await response.json();
        console.log({ gamesData });
        localStorage.setItem('gamesData', JSON.stringify(gamesData));
        setGames(gamesData);
      } catch (error) {
        console.error(error);
        return {};
      }
    }
    return {};
  };

  const storeTeamSelected = (teamSelected: string) => {
    setTeamSelected(teamSelected);

    if (teamSelected.length !== 0) {
      localStorage.setItem('teamSelected', teamSelected);
    }
  };

  useEffect(() => {
    getStoredData();
  }, []);

  useEffect(() => {
    async function fetchTeams() {
      const teamsData = await getTeamsFromApi();
      setTeams(teamsData);
    }
    fetchTeams();
  }, []);

  useEffect(() => {
    if (teamSelected.length > 0) {
      async function fetchGames() {
        await getGamesFromApi();
      }
      fetchGames();
    }
  }, [teamSelected]);

  return (
    <ScrollView>
      {!teamSelected.length && (
        <View style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
          <Loader />
        </View>
      )}
      {displayTeamSelector()}
    </ScrollView>
  );
}
