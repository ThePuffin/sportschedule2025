import DateRangePicker from '@/components/DatePicker';
import { ThemedView } from '@/components/ThemedView';
import Loader from '../../components/Loader';
import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import Buttons from '../../components/Buttons';
import Cards from '../../components/Cards';
import GamesSelected from '../../components/GamesSelected';
import Selector from '../../components/Selector';
import { ButtonsKind } from '../../constants/enum';
import { readableDate, addDays } from '../../utils/date';
import { FilterGames, GameFormatted, Team } from '../../utils/types';
import { addNewTeamId, randomNumber, removeLastTeamId } from '../../utils/utils';

export default function Calendar() {
  const now = new Date();
  const tomorrow = addDays(now, 7);

  const [dateRange, setDateRange] = useState({ startDate: now, endDate: tomorrow });
  const [games, setGames] = useState<FilterGames>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsSelected, setTeamsSelected] = useState<string[]>([]);
  const [gamesSelected, setGamesSelected] = useState<GameFormatted[]>([]);

  const handleDateChange = (startDate, endDate) => {
    getGamesFromApi(startDate, endDate);
    setDateRange({ startDate, endDate });
  };

  const getSelectedTeams = (allTeams) => {
    const selection = [];
    //TODO: get datas from storage
    if (!selection.length) {
      while (selection.length < 2) {
        addNewTeamId(selection, allTeams);
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
          `http://localhost:3000/games/filter?startDate=${start}&endDate=${end}&teamSelectedIds=${teamsSelected.join(
            ','
          )}`
        );
        const gamesData = await response.json();
        setGames(gamesData);
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

  const handleButtonClick = async (clickedButton: string) => {
    switch (clickedButton) {
      case ButtonsKind.ADDTEAM:
        setTeamsSelected(addNewTeamId(teamsSelected, teams));
        getGamesFromApi();
        break;
      case ButtonsKind.REMOVETEAM:
        setTeamsSelected(removeLastTeamId(teamsSelected));
        setGamesSelected(
          gamesSelected.filter((gameSelected) => newTeamsSelection.includes(gameSelected.teamSelectedId))
        );
        getGamesFromApi();
        break;
      case ButtonsKind.REMOVEGAMES:
        setGamesSelected([]);
        break;
      default:
        break;
    }
  };
   const handleGamesSelection = async (game: GameFormatted) => {
     let newSelection = [...gamesSelected];

     const wasAdded = gamesSelected.some((gameSelect) => game._id === gameSelect._id);

     if (wasAdded) {
       newSelection = newSelection.filter((gameSelect) => gameSelect._id != game._id);
     } else {
       newSelection.push(game);
       newSelection = newSelection.sort((a, b) => {
         return new Date(a.gameDate) - new Date(b.gameDate);
       });
     }

     setGamesSelected(newSelection);
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
                  <Cards data={game} showDate={true} onSelection={handleGamesSelection} />
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

  return (
    <ScrollView>
      <DateRangePicker dateRange={dateRange} onDateChange={handleDateChange} noEnd={false} />
      <Buttons
        onClicks={handleButtonClick}
        data={{ selectedTeamsNumber: teamsSelected.length, selectedGamesNumber: gamesSelected.length }}
      />
      {!!gamesSelected.length && <GamesSelected onAction={handleGamesSelection} data={gamesSelected} />}
      <table style={{ tableLayout: 'fixed', width: '100%' }}>
        <tbody>
          <tr>{displayTeamSelector()}</tr>
        </tbody>
      </table>
    </ScrollView>
  );
}
