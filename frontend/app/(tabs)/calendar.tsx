import DateRangePicker from '@/components/DatePicker';
import { ThemedView } from '@/components/ThemedView';
import Loader from '../../components/Loader';
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Buttons from '../../components/Buttons';
import Cards from '../../components/Cards';
import GamesSelected from '../../components/GamesSelected';
import Selector from '../../components/Selector';
import { ButtonsKind } from '../../constants/enum';
import { readableDate, addDays } from '../../utils/date';
import { FilterGames, GameFormatted, Team } from '../../utils/types';
import { addNewTeamId, randomNumber, removeLastTeamId } from '../../utils/utils';
const EXPO_PUBLIC_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://sportschedule2025backend.onrender.com';

export default function Calendar() {
  const beginDate = new Date();
  beginDate.setHours(23, 59, 59, 999);
  const endDate = new Date(addDays(beginDate, 15));
  endDate.setHours(23, 59, 59, 999);
  const initializeDateRange = () => {
    const storedStartDate = localStorage.getItem('startDate');
    const storedEndDate = localStorage.getItem('endDate');

    let needToUpdateGames = false;
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
      setDateRange({ startDate: start, endDate: end });
      getGamesFromApi(start, end);
    }
  };

  const [dateRange, setDateRange] = useState({
    startDate: localStorage.getItem('startDate') ?? beginDate.toISOString(),
    endDate: localStorage.getItem('endDate') ?? endDate.toISOString(),
  });
  const [games, setGames] = useState<FilterGames>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsSelected, setTeamsSelected] = useState<string[]>([]);
  const [gamesSelected, setGamesSelected] = useState<GameFormatted[]>([]);

  const handleDateChange = (startDate, endDate) => {
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

  const getSelectedTeams = (allTeams) => {
    const selection = localStorage.getItem('teamsSelected')
      ? JSON.parse(localStorage.getItem('teamsSelected')).map((team) => team.uniqueId)
      : teamsSelected ?? [];
    if (!selection.length) {
      while (selection.length < 2) {
        addNewTeamId(selection, allTeams);
      }
    }
    storeTeamsSelected(selection);
  };

  const getStoredData = () => {
    const selection = localStorage.getItem('teamsSelected')
      ? JSON.parse(localStorage.getItem('teamsSelected')).map((team) => team.uniqueId)
      : [];
    if (selection.length > 0) {
      storeTeamsSelected(selection);

      const storedGamesData = localStorage.getItem('gamesData') ? JSON.parse(localStorage.getItem('gamesData')) : {};
      setGames(storedGamesData);

      const storedGamesSelected = localStorage.getItem('gameSelected')
        ? localStorage.getItem('gameSelected').split(';')
        : [];
      setGamesSelected(storedGamesSelected.map((game) => JSON.parse(game)));
      setTeams(selection);
    } else {
      setTeamsSelected(selection);
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

  const getGamesFromApi = async (startDate: string, endDate: string): Promise<FilterGames> => {
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
            const isSelected = gamesSelected.some((gameSelect) => game._id === gameSelect._id);
            return (
              <td key={gameId}>
                <ThemedView>
                  <Cards data={game} showDate={true} onSelection={handleGamesSelection} selected={isSelected} />
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
    getStoredData();
  }, []);

  useEffect(() => {
    async function fetchTeams() {
      const teamsData = await getTeamsFromApi();
      console.log({ teamsData });

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

  return (
    <ScrollView>
      <DateRangePicker dateRange={dateRange} onDateChange={handleDateChange} noEnd={false} />
      <Buttons
        onClicks={handleButtonClick}
        data={{ selectedTeamsNumber: teamsSelected.length, selectedGamesNumber: gamesSelected.length }}
      />
      {!!gamesSelected.length && <GamesSelected onAction={handleGamesSelection} data={gamesSelected} />}
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
