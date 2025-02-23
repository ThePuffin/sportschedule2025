import { ThemedView } from '@/components/ThemedView';
import { Button } from '@rneui/themed';
import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import Buttons from '../../components/Buttons';
import Cards from '../../components/Cards';
import Selector from '../../components/Selector';
import { readableDate } from '../../utils/date';
import { FilterGames, GameFormatted, Team } from '../../utils/types';
import { randomNumber, addNewTeamId, removeLastTeamId } from '../../utils/utils';
import { ButtonsKind } from '../../constants/enum.ts';

export default function Calendar() {
  const [games, setGames] = useState<FilterGames>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsSelected, setTeamsSelected] = useState<string[]>([]);
  const [gamesSelected, setGamesSelected] = useState<GameFormatted[]>([]);

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

  const handleButtonClick = async (clickedButton: string) => {
    switch (clickedButton) {
      case ButtonsKind.ADDTEAM:
        setTeamsSelected(addNewTeamId(teamsSelected, teams));
        getGamesFromApi();
        break;
      case ButtonsKind.REMOVETEAM:
        const newTeamsSelection = removeLastTeamId(teamsSelected);
        setTeamsSelected(newTeamsSelection);
        setGamesSelected(
          gamesSelected.filter((gameSelected) => newTeamsSelection.includes(gameSelected.teamSelectedId))
        );
        getGamesFromApi();
        break;
      case ButtonsKind.REMOVEGAMES:
        // TODO: REMOVE ALL GAMES WHEN AVAILABLE
        break;
      default:
        break;
    }
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

  const displayGamesSelected = () => {
    return gamesSelected.map((gameSelected, i) => {
      return (
        <td key={gameSelected.gameId}>
          <ThemedView>
            <Cards data={gameSelected} showDate={true} showName={false} onSelection={handleGamesSelection} />
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
        await getGamesFromApi();
      }
      fetchGames();
    }
  }, [teamsSelected]);

  return (
    <ScrollView>
      <table style={{ tableLayout: 'fixed', width: '100%' }}>
        <tbody>
          <tr>{displayGamesSelected()}</tr>
        </tbody>
      </table>
      <Buttons onClicks={handleButtonClick} data={{ selectedNumber: teamsSelected.length }} />
      <table style={{ tableLayout: 'fixed', width: '100%' }}>
        <tbody>
          <tr>{displayTeamSelector()}</tr>
        </tbody>
      </table>
    </ScrollView>
  );
}
