import DateRangePicker from '@/components/DatePicker';
import { ThemedView } from '@/components/ThemedView';
import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, View } from 'react-native';
import Buttons from '../../components/Buttons';
import Cards from '../../components/Cards';
import GamesSelected from '../../components/GamesSelected';
import Loader from '../../components/Loader';
import Selector from '../../components/Selector';
import { ButtonsKind } from '../../constants/enum';
import { addDays, readableDate } from '../../utils/date';
import { FilterGames, GameFormatted, Team } from '../../utils/types';
import { addNewTeamId, randomNumber, removeLastTeamId } from '../../utils/utils';
const EXPO_PUBLIC_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://sportschedule2025backend.onrender.com';

export default function Calendar() {
  const [games, setGames] = useState<FilterGames>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsSelected, setTeamsSelected] = useState<string[]>([]);
  const [gamesSelected, setGamesSelected] = useState<GameFormatted[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [maxTeamsNumber, setMaxTeamsNumber] = useState(6);

  const beginDate = new Date();
  beginDate.setHours(23, 59, 59, 999);
  const endDate = new Date(addDays(beginDate, 15));
  endDate.setHours(23, 59, 59, 999);
  const initializeDateRange = () => {
    const storedStartDate = localStorage.getItem('startDate');
    const storedEndDate = localStorage.getItem('endDate');

    let start = storedStartDate;
    let end = storedEndDate;
    if (!storedStartDate || new Date(storedStartDate) < beginDate) {
      start = beginDate.toISOString();
      localStorage.setItem('startDate', start);
    }
    if (!storedEndDate || new Date(storedEndDate) < beginDate) {
      end = endDate.toISOString();
      localStorage.setItem('endDate', end);
    }
    if (start !== storedStartDate || end !== storedEndDate) {
      setDateRange({ startDate: start ?? beginDate.toISOString(), endDate: end ?? endDate.toISOString() });
      getGamesFromApi(start ?? beginDate.toISOString(), end ?? endDate.toISOString());
    }
  };

  const [dateRange, setDateRange] = useState({
    startDate: localStorage.getItem('startDate') ?? beginDate.toISOString(),
    endDate: localStorage.getItem('endDate') ?? endDate.toISOString(),
  });

  const handleDateChange = (startDate: string, endDate: string) => {
    localStorage.setItem('startDate', startDate);
    localStorage.setItem('endDate', endDate);
    getGamesFromApi(startDate, endDate);
    setDateRange({ startDate, endDate });
    const newGamesSelection = gamesSelected.filter((gameSelected) => {
      const gameDate = new Date(gameSelected.gameDate);
      return gameDate >= new Date(startDate) && gameDate <= new Date(endDate);
    });
    setGamesSelected(newGamesSelection);
    localStorage.setItem('gameSelected', newGamesSelection.map((game) => JSON.stringify(game)).join(';'));
  };

  const getSelectedTeams = (allTeams: Team[]) => {
    const selection = localStorage.getItem('teamsSelected')
      ? JSON.parse(localStorage.getItem('teamsSelected') ?? '[]').map((team: Team) => team.uniqueId)
      : teamsSelected ?? [];
    if (!selection.length) {
      while (selection.length < 2) {
        addNewTeamId(selection, allTeams);
      }
    }
    storeTeamsSelected(selection);
  };

  const getStoredGames = () => {
    const gamesDataString = localStorage.getItem('gamesData');
    const storedGamesDataRaw = gamesDataString && gamesDataString.length ? JSON.parse(gamesDataString) : {};
    if (!Object.keys(storedGamesDataRaw).length) return {};

    const begindateStr = beginDate.toISOString().split('T')[0];

    // Keep only games whose date is today or in the future
    const filteredGamesData = Object.fromEntries(
      Object.entries(storedGamesDataRaw).filter(([date]) => date >= begindateStr)
    );

    return filteredGamesData;
  };

  const getStoredTeams = () => {
    const selectionString = localStorage.getItem('teamsSelected');
    const selection =
      selectionString && selectionString.length
        ? JSON.parse(localStorage.getItem('teamsSelected') ?? '[]').map((team: Team) => team.uniqueId)
        : [];
    if (selection.length > 0) {
      storeTeamsSelected(selection);

      setGames(getStoredGames() as FilterGames);

      const storedGamesSelected = localStorage.getItem('gameSelected')
        ? localStorage.getItem('gameSelected')?.split(';')
        : [];
      setGamesSelected((storedGamesSelected ?? []).map((game) => JSON.parse(game)));
      setTeams(selection);
    } else {
      setTeamsSelected(selection);
    }
  };

  const getTeamsFromApi = async (): Promise<Team[]> => {
    setLoadingTeams(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_API_BASE_URL}/teams`);
      const allTeams = await response.json();
      getSelectedTeams(allTeams);
      setLoadingTeams(false);
      return allTeams;
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  const getGamesFromApi = async (
    startDate: string | undefined = undefined,
    endDate: string | undefined = undefined
  ): Promise<FilterGames> => {
    if (teamsSelected && teamsSelected.length !== 0) {
      let start = readableDate(dateRange.startDate);
      let end = readableDate(dateRange.endDate);
      if (startDate && endDate) {
        start = readableDate(startDate);
        end = readableDate(endDate);
      }

      try {
        const response = await fetch(
          `${EXPO_PUBLIC_API_BASE_URL}/games/filter?startDate=${start}&endDate=${end}&teamSelectedIds=${teamsSelected.join(
            ','
          )}`
        );
        const gamesData = await response.json();
        localStorage.setItem('gamesData', JSON.stringify(gamesData));
        setGames(gamesData);
      } catch (error) {
        console.error(error);
        return {};
      }
    }
    return {};
  };

  const storeTeamsSelected = (teamsSelected: string[]) => {
    setTeamsSelected(teamsSelected);
    const selectedTeams = teamsSelected
      .map((teamId) => {
        const team = teams.find((team) => team.uniqueId === teamId);

        return team;
      })
      .filter((team) => team);

    if (selectedTeams.length !== 0) {
      localStorage.setItem('teamsSelected', JSON.stringify(selectedTeams));
    }
  };

  const handleTeamSelectionChange = (teamSelectedId: string, i: number) => {
    const newTeamsSelected = [...teamsSelected];
    newTeamsSelected[i] = teamSelectedId;
    storeTeamsSelected(newTeamsSelected);
    const newSelection = gamesSelected.filter((gameSelected) => newTeamsSelected.includes(gameSelected.teamSelectedId));
    setGamesSelected(newSelection);
    localStorage.setItem('gameSelected', newSelection.map((game) => JSON.stringify(game)).join(';'));
  };

  const handleButtonClick = async (clickedButton: string) => {
    let newTeamsSelected;
    let newGamesSelected;
    switch (clickedButton) {
      case ButtonsKind.ADDTEAM:
        newTeamsSelected = addNewTeamId(teamsSelected, teams);
        storeTeamsSelected(newTeamsSelected);
        getGamesFromApi();
        break;
      case ButtonsKind.REMOVETEAM:
        newTeamsSelected = removeLastTeamId(teamsSelected);
        storeTeamsSelected(newTeamsSelected);
        newGamesSelected = gamesSelected.filter((gameSelected) => teamsSelected.includes(gameSelected.teamSelectedId));
        setGamesSelected(newGamesSelected);
        localStorage.setItem('gameSelected', newGamesSelected.map((game) => JSON.stringify(game)).join(';'));
        getGamesFromApi();
        break;
      case ButtonsKind.REMOVEGAMES:
        setGamesSelected([]);
        localStorage.setItem('gameSelected', '');
        break;
      default:
        break;
    }
  };
  const handleGamesSelection = async (game: GameFormatted) => {
    let newSelection = [...gamesSelected];

    const wasAdded = gamesSelected.some((gameSelect) => game._id === gameSelect._id);

    if (wasAdded) {
      newSelection = newSelection.filter((gameSelect) => gameSelect._id !== game._id);
    } else {
      newSelection.push(game);
      newSelection = newSelection.sort((a, b) => {
        return new Date(a.startTimeUTC) - new Date(b.startTimeUTC);
      });
    }

    setGamesSelected(newSelection);
    localStorage.setItem('gameSelected', newSelection.map((game) => JSON.stringify(game)).join(';'));
  };

  const displayTeamSelector = () => {
    return teamsSelected.map((teamSelectedId, i) => {
      const data = { i, items: teams, itemsSelectedIds: teamsSelected, itemSelectedId: teamSelectedId };
      return (
        <td key={`${teamSelectedId}-${teamsSelected.length}`}>
          <ThemedView>
            <Selector data={data} onItemSelectionChange={handleTeamSelectionChange} />
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
            const isSelected = gamesSelected.some((gameSelect) => game._id === gameSelect._id);
            return (
              <td key={gameId}>
                <ThemedView>
                  <Cards
                    data={game}
                    numberSelected={teamsSelected.length}
                    showDate={true}
                    onSelection={handleGamesSelection}
                    selected={isSelected}
                  />
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
  useEffect(() => {
    initializeDateRange();
    getStoredTeams();
  }, []);

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
        await getGamesFromApi();
      }
      fetchGames();
    }
  }, [teamsSelected]);

  useEffect(() => {
    const updateDeviceType = () => {
      const { width } = Dimensions.get('window');
      if (width <= 1075) {
        setMaxTeamsNumber(6);
      } else {
        setMaxTeamsNumber(8);
      }
    };

    updateDeviceType();
  }, []);

  return (
    <ScrollView>
      <DateRangePicker dateRange={dateRange} onDateChange={handleDateChange} noEnd={false} />
      <Buttons
        onClicks={handleButtonClick}
        data={{
          selectedTeamsNumber: teamsSelected.length,
          selectedGamesNumber: gamesSelected.length,
          loadingTeams,
          maxTeamsNumber,
        }}
      />
      {!!gamesSelected.length && (
        <GamesSelected onAction={handleGamesSelection} data={gamesSelected} teamNumber={maxTeamsNumber} />
      )}
      {!teamsSelected.length && (
        <View style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
          <Loader />
        </View>
      )}
      <table style={{ tableLayout: 'fixed', width: '100%' }}>
        <tbody>
          <tr>{displayTeamSelector()}</tr>
        </tbody>
      </table>
    </ScrollView>
  );
}
