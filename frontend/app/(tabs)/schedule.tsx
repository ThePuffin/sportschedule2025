import Selector from '@/components/Selector';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getRandomTeamId, randomNumber, translateWord } from '@/utils/utils';
import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, View } from 'react-native';
import Accordion from '../../components/Accordion'; // Added import
import Loader from '../../components/Loader';
import { FilterGames, GameFormatted, Team } from '../../utils/types'; // Added GameFormatted
const EXPO_PUBLIC_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://sportschedule2025backend.onrender.com';

export default function Schedule() {
  const [games, setGames] = useState<FilterGames>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamSelected, setTeamSelected] = useState<string>('');
  const [isSmallDevice, setIsSmallDevice] = useState(false);

  useEffect(() => {
    const updateDeviceType = () => {
      const { width } = Dimensions.get('window');
      if (width <= 1075) {
        setIsSmallDevice(true);
      } else {
        setIsSmallDevice(false);
      }
    };

    updateDeviceType();
    Dimensions.addEventListener('change', updateDeviceType);

    return () => {
      Dimensions.removeEventListener('change', updateDeviceType);
    };
  }, []);

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

      const scheduleData = localStorage.getItem('scheduleData');
      if (scheduleData) {
        setGames(JSON.parse(scheduleData));
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
    const today = new Date().toISOString().split('T')[0];
    if (!games || (games[today]?.[0].updateDate ?? '') === '') {
      return (
        <div>
          <br />
          <ThemedText>{translateWord('noResults')}</ThemedText>;
        </div>
      );
    } else if (games) {
      const months = Object.keys(games).reduce((acc: { [key: string]: string[] }, day: string) => {
        const month = new Date(day).toLocaleString('default', { month: 'long' });
        if (!acc[month]) {
          acc[month] = [];
        }
        acc[month].push(day);
        return acc;
      }, {});

      if (Object.keys(months).length) {
        return Object.entries(months).map(([month, daysInMonth], monthIndex) => {
          const gamesForThisMonth: GameFormatted[] = daysInMonth.reduce((acc: GameFormatted[], day: string) => {
            const gameOnDay = games[day]?.find((game: GameFormatted) => game.teamSelectedId === teamSelectedId);
            if (gameOnDay) {
              acc.push(gameOnDay);
            }
            return acc;
          }, []);

          if (gamesForThisMonth.length === 0) {
            return null;
          }
          return (
            <div style={{ width: isSmallDevice ? '100%' : '50%', margin: '0 auto' }}>
              <Accordion
                key={month}
                filter={month}
                i={monthIndex}
                gamesFiltred={gamesForThisMonth}
                open={monthIndex === 0}
                showDate={true}
              />
            </div>
          );
        });
      }
    }
    return <Loader />;
  };

  const getGamesFromApi = async (): Promise<FilterGames> => {
    if (teamSelected && teamSelected.length !== 0) {
      try {
        const response = await fetch(`${EXPO_PUBLIC_API_BASE_URL}/games/team/${teamSelected}`);

        const scheduleData = await response.json();
        localStorage.setItem('scheduleData', JSON.stringify(scheduleData));
        setGames(scheduleData);
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
