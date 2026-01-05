import DateRangePicker from '@/components/DatePicker';
import { ThemedView } from '@/components/ThemedView';
import { fetchTeams, getCache, saveCache } from '@/utils/fetchData';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, ScrollView } from 'react-native';
import { ActionButton, ActionButtonRef } from '../../components/ActionButton';
import Buttons from '../../components/Buttons';
import Cards from '../../components/Cards';
import GamesSelected from '../../components/GamesSelected';
import LoadingView from '../../components/LoadingView';
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
  const scrollViewRef = useRef<ScrollView>(null);
  const ActionButtonRef = useRef<ActionButtonRef>(null);

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
      setDateRange({
        startDate: new Date(start ?? beginDate.toISOString()),
        endDate: new Date(end ?? endDate.toISOString()),
      });
      getGamesFromApi(start ?? beginDate.toISOString(), end ?? endDate.toISOString());
    }
  };

  const [dateRange, setDateRange] = useState({
    startDate: new Date(localStorage.getItem('startDate') ?? beginDate),
    endDate: new Date(localStorage.getItem('endDate') ?? endDate),
  });

  const handleDateChange = (startDate: Date, endDate: Date) => {
    const start = startDate.toISOString();
    const end = endDate.toISOString();
    localStorage.setItem('startDate', start);
    localStorage.setItem('endDate', end);
    getGamesFromApi(start, end);
    setDateRange({ startDate, endDate });
    const newGamesSelection = gamesSelected.filter((gameSelected) => {
      const gameDate = new Date(gameSelected.gameDate);
      return gameDate >= startDate && gameDate <= endDate;
    });
    setGamesSelected(newGamesSelection);
    saveCache('gameSelected', newGamesSelection);
  };

  const getSelectedTeams = (allTeams: Team[]) => {
    const selection = getCache<Team[]>('teamsSelected')?.map((team) => team.uniqueId) ?? teamsSelected ?? [];
    if (!selection.length) {
      const favoriteTeams = getCache<string[]>('favoriteTeams')?.filter((team) => team !== '') || [];
      if (favoriteTeams.length) {
        for (const favTeamId of favoriteTeams) {
          if (allTeams.some((team) => team.uniqueId === favTeamId)) {
            selection.push(favTeamId);
          }
        }
      }
      while (selection.length < 2) {
        addNewTeamId(selection, allTeams);
      }
    }
    storeTeamsSelected(selection);
  };

  const getStoredGames = () => {
    const storedGamesDataRaw = getCache<FilterGames>('gamesData');
    if (!storedGamesDataRaw || !Object.keys(storedGamesDataRaw).length) return {};

    const begindateStr = beginDate.toISOString().split('T')[0];

    // Keep only games whose date is today or in the future
    const filteredGamesData = Object.fromEntries(
      Object.entries(storedGamesDataRaw).filter(([date]) => date >= begindateStr)
    );

    return filteredGamesData;
  };

  const getStoredTeams = () => {
    const selection = getCache<Team[]>('teamsSelected')?.map((team) => team.uniqueId) ?? [];
    if (selection.length > 0) {
      storeTeamsSelected(selection);

      setGames(getStoredGames() as FilterGames);

      const storedGamesSelected = getCache<GameFormatted[]>('gameSelected') ?? [];
      const today = new Date().toISOString().split('T')[0];
      const gamesSelectedFromStorage = storedGamesSelected.filter((game) => game.gameDate >= today);
      setGamesSelected(gamesSelectedFromStorage);
      saveCache('gameSelected', gamesSelectedFromStorage);
      setTeams(selection);
    } else {
      setTeamsSelected(selection);
    }
  };

  const getTeamsFromApi = async (): Promise<Team[]> => {
    setLoadingTeams(true);
    try {
      const allTeams = await fetchTeams();
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
        saveCache('gamesData', gamesData);
        setGames(gamesData);
      } catch (error) {
        console.error(error);
        return {};
      }
    }
    return {};
  };

  const storeTeamsSelected = (teamsSelected: string[]) => {
    teamsSelected = teamsSelected.filter((teamId, i) => teamId && i < maxTeamsNumber);
    setTeamsSelected(teamsSelected);
    const selectedTeams = teamsSelected
      .map((teamId) => {
        const team = teams.find((team) => team.uniqueId === teamId);
        return team;
      })
      .filter((team) => team);

    if (selectedTeams.length !== 0) {
      saveCache('teamsSelected', selectedTeams);
    }
  };

  const handleTeamSelectionChange = (teamSelectedId: string | string[], i: number) => {
    if (typeof teamSelectedId === 'string') {
      const newTeamsSelected = [...teamsSelected];
      newTeamsSelected[i] = teamSelectedId;
      storeTeamsSelected(newTeamsSelected);
      const newSelection = gamesSelected.filter((gameSelected) =>
        newTeamsSelected.includes(gameSelected.teamSelectedId)
      );
      setGamesSelected(newSelection);
      saveCache('gameSelected', newSelection);
    }
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
        saveCache('gameSelected', newGamesSelected);
        getGamesFromApi();
        break;
      case ButtonsKind.REMOVEGAMES:
        setGamesSelected([]);
        saveCache('gameSelected', []);
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
      newSelection = newSelection.sort((a: GameFormatted, b: GameFormatted) => {
        return new Date(a.startTimeUTC).getTime() - new Date(b.startTimeUTC).getTime();
      });
    }

    setGamesSelected(newSelection);
    saveCache('gameSelected', newSelection);
  };

  const displayTeamSelector = () => {
    return teamsSelected.map((teamSelectedId, i) => {
      const data = { i, items: teams, itemsSelectedIds: teamsSelected, itemSelectedId: teamSelectedId };
      return (
        <td key={`${teamSelectedId}-${teamsSelected.length}`}>
          <ThemedView>
            <Selector data={data} onItemSelectionChange={handleTeamSelectionChange} isClearable={false} />
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
              <div key={gameId} style={{ display: 'inline-block', width: '100%' }}>
                <ThemedView>
                  <Cards
                    data={game}
                    numberSelected={teamsSelected.length}
                    showDate={true}
                    onSelection={handleGamesSelection}
                    selected={isSelected}
                  />
                </ThemedView>
              </div>
            );
          }
          return null;
        });
      }
    }
    return <LoadingView />;
  };
  useEffect(() => {
    initializeDateRange();
    getStoredTeams();
  }, []);

  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

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
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        ref={scrollViewRef}
        onScroll={(event) => ActionButtonRef.current?.handleScroll(event)}
        scrollEventThrottle={16}
      >
        <DateRangePicker dateRange={dateRange} onDateChange={handleDateChange} />
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
          <GamesSelected
            onAction={handleGamesSelection}
            data={gamesSelected}
            teamNumber={maxTeamsNumber > teamsSelected?.length ? teamsSelected.length : maxTeamsNumber}
          />
        )}
        {!teamsSelected.length && <LoadingView />}
        <table style={{ tableLayout: 'fixed', width: '100%' }}>
          <tbody>
            <tr>{displayTeamSelector()}</tr>
          </tbody>
        </table>
      </ScrollView>
      <ActionButton ref={ActionButtonRef} scrollViewRef={scrollViewRef} />
    </ThemedView>
  );
}
