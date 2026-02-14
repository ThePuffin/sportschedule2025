import AppLogo from '@/components/AppLogo';
import DateRangePicker from '@/components/DatePicker';
import { ThemedElements } from '@/components/ThemedElements';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { fetchTeams, getCache, saveCache } from '@/utils/fetchData';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Accordion from '../../components/Accordion';
import { ActionButton, ActionButtonRef } from '../../components/ActionButton';
import FilterSlider from '../../components/FilterSlider';
import GamesSelected from '../../components/GamesSelected';
import LoadingView from '../../components/LoadingView';
import TeamReorderSelector from '../../components/TeamReorderSelector';
import { addDays, readableDate } from '../../utils/date';
import { FilterGames, GameFormatted, Team } from '../../utils/types';
import { addNewTeamId, translateWord } from '../../utils/utils';
const EXPO_PUBLIC_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://sportschedule2025backend.onrender.com';

export default function Calendar() {
  const iconColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({ light: '#F0F0F0', dark: '#121212' }, 'background');
  const modalBackgroundColor = useThemeColor({ light: '#ffffff', dark: '#000' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const { width } = useWindowDimensions();
  const isSmallDevice = width < 768;
  const [games, setGames] = useState<FilterGames>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsSelected, setTeamsSelected] = useState<string[]>([]);
  const [gamesSelected, setGamesSelected] = useState<GameFormatted[]>([]);
  const [maxTeamsNumber, setMaxTeamsNumber] = useState(6);
  const scrollViewRef = useRef<ScrollView>(null);
  const ActionButtonRef = useRef<ActionButtonRef>(null);
  const [allowedLeagues, setAllowedLeagues] = useState<string[]>([]);
  const [reorderModalVisible, setReorderModalVisible] = useState(false);
  const [tempTeams, setTempTeams] = useState<string[]>([]);
  const [hiddenTeams, setHiddenTeams] = useState<string[]>([]);

  useEffect(() => {
    const updateLeagues = () => {
      const stored = getCache<string[]>('leaguesSelected');
      setAllowedLeagues(stored || []);
    };
    updateLeagues();
    if (globalThis.window !== undefined) {
      globalThis.window.addEventListener('leaguesUpdated', updateLeagues);
      return () => globalThis.window.removeEventListener('leaguesUpdated', updateLeagues);
    }
  }, []);

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

  const filteredTeamsSelected = useMemo(() => {
    if (allowedLeagues.length === 0) return teamsSelected;
    return teamsSelected.filter((teamId) => {
      const team = teams.find((t) => t.uniqueId === teamId);
      return team ? allowedLeagues.includes(team.league) : true;
    });
  }, [teamsSelected, allowedLeagues, teams]);

  useEffect(() => {
    setHiddenTeams((prev) => prev.filter((id) => filteredTeamsSelected.includes(id)));
  }, [filteredTeamsSelected]);

  const beginDate = new Date();
  beginDate.setHours(0, 0, 0, 0);
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
    setGames({});
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
      const availableTeams = allTeams.filter((t) => allowedLeagues.length === 0 || allowedLeagues.includes(t.league));
      while (selection.length < 2) {
        addNewTeamId(selection, availableTeams);
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
      Object.entries(storedGamesDataRaw).filter(([date]) => date >= begindateStr),
    );

    return filteredGamesData;
  };

  const getStoredTeams = () => {
    const cachedTeams = getCache<Team[]>('teamsSelected');
    const selection = cachedTeams?.map((team) => team.uniqueId) ?? [];
    if (selection.length > 0) {
      storeTeamsSelected(selection);

      setGames(getStoredGames() as FilterGames);

      const storedGamesSelected = getCache<GameFormatted[]>('gameSelected') ?? [];
      const today = new Date().toISOString().split('T')[0];
      const gamesSelectedFromStorage = storedGamesSelected.filter((game) => game.gameDate >= today);
      setGamesSelected(gamesSelectedFromStorage);
      saveCache('gameSelected', gamesSelectedFromStorage);
      if (cachedTeams) {
        setTeams(cachedTeams);
      }
    } else {
      setTeamsSelected(selection);
    }
  };

  const getTeamsFromApi = async (): Promise<Team[]> => {
    try {
      const allTeams = await fetchTeams();
      getSelectedTeams(allTeams);
      return allTeams;
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  const getGamesFromApi = async (
    startDate: string | undefined = undefined,
    endDate: string | undefined = undefined,
  ): Promise<void> => {
    if (teamsSelected && teamsSelected.length !== 0) {
      let start = readableDate(dateRange.startDate);
      let end = readableDate(dateRange.endDate);
      if (startDate && endDate) {
        start = readableDate(new Date(startDate));
        end = readableDate(new Date(endDate));
      }

      try {
        const response = await fetch(
          `${EXPO_PUBLIC_API_BASE_URL}/games/filter?startDate=${start}&endDate=${end}&teamSelectedIds=${teamsSelected.join(
            ',',
          )}`,
        );
        const gamesData = await response.json();
        saveCache('gamesData', gamesData);
        setGames(gamesData);
      } catch (error) {
        console.error(error);
      }
    }
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

  const handleOpenReorder = () => {
    setTempTeams(teamsSelected);
    setReorderModalVisible(true);
  };

  const handleSaveReorder = () => {
    storeTeamsSelected(tempTeams);
    setReorderModalVisible(false);
  };

  const handleClearGamesSelection = () => {
    setGamesSelected([]);
    saveCache('gameSelected', []);
  };

  const displayAccordions = () => {
    if (!games || Object.keys(games).length === 0) return null;

    const sortedDates = Object.keys(games).sort();

    return sortedDates.map((date, index) => {
      const [year, month, day] = date.split('-').map(Number);
      const gameDate = new Date(year, month - 1, day);
      if (isNaN(gameDate.getTime())) return null;
      const startDate = new Date(dateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);

      if (gameDate < startDate || gameDate > endDate) return null;

      const gamesForDate = games[date].filter(
        (g) => filteredTeamsSelected.includes(g.teamSelectedId) && !hiddenTeams.includes(g.teamSelectedId),
      );

      if (gamesForDate.length === 0) return null;

      const formattedDate = gameDate.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      return (
        <div key={date} style={{ width: '100%', margin: '0 auto' }}>
          <Accordion
            filter={formattedDate}
            i={index}
            gamesFiltred={gamesForDate}
            open={true}
            showDate={false}
            gamesSelected={gamesSelected}
            onSelection={handleGamesSelection}
          />
        </div>
      );
    });
  };

  useEffect(() => {
    initializeDateRange();
    getStoredTeams();
  }, []);

  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
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
  }, [teamsSelected, teams]);

  return (
    <ThemedView style={{ flex: 1 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '5px 15px 0 15px',
        }}
      >
        <AppLogo />
      </div>
      <ScrollView
        ref={scrollViewRef}
        onScroll={(event) => ActionButtonRef.current?.handleScroll(event)}
        scrollEventThrottle={16}
      >
        {!!gamesSelected.length && (
          <GamesSelected
            onAction={handleGamesSelection}
            data={gamesSelected.filter((g) => filteredTeamsSelected.includes(g.teamSelectedId))}
            teamNumber={maxTeamsNumber > filteredTeamsSelected?.length ? filteredTeamsSelected.length : maxTeamsNumber}
          />
        )}
        <div style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <ThemedView>
            <div style={{ width: '100%', padding: isSmallDevice ? 0 : 10, boxSizing: 'border-box' }}>
              <div style={{ position: 'relative', zIndex: 20 }}>
                <DateRangePicker dateRange={dateRange} onDateChange={handleDateChange} />
              </div>
              <ThemedElements>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    width: '100%',
                    alignItems: 'center',
                    paddingLeft: 15,
                    paddingRight: 15,
                    boxSizing: 'border-box',
                  }}
                >
                  <TouchableOpacity
                    onPress={handleOpenReorder}
                    style={{
                      position: 'relative',
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                      backgroundColor,
                      border: `1px solid ${iconColor}`,
                      borderRadius: '50%',
                      flexShrink: 0,
                    }}
                  >
                    <FontAwesome name="sliders" size={20} color={iconColor} />
                  </TouchableOpacity>
                  <View
                    style={
                      {
                        flex: 1,
                        overflow: 'hidden',
                        maskImage:
                          'linear-gradient(to right, transparent 0%, black 40px, black calc(100% - 40px), transparent 100%)',
                        WebkitMaskImage:
                          'linear-gradient(to right, transparent 0%, black 40px, black calc(100% - 40px), transparent 100%)',
                      } as any
                    }
                  >
                    <FilterSlider
                      data={[
                        { label: translateWord('all'), value: 'ALL' },
                        ...filteredTeamsSelected
                          .map((id) => teams.find((t) => t.uniqueId === id))
                          .filter((t): t is Team => !!t)
                          .map((t) => ({ label: t.teamCommonName, value: t.uniqueId })),
                      ]}
                      selectedFilters={
                        hiddenTeams.length === 0
                          ? ['ALL', ...filteredTeamsSelected]
                          : filteredTeamsSelected.filter((id) => !hiddenTeams.includes(id))
                      }
                      onFilterChange={(val) => {
                        if (val === 'ALL') setHiddenTeams([]);
                        else
                          setHiddenTeams((prev) =>
                            prev.includes(val) ? prev.filter((id) => id !== val) : [...prev, val],
                          );
                      }}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={handleClearGamesSelection}
                    style={{
                      position: 'relative',
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: 10,
                      backgroundColor,
                      border: `1px solid ${iconColor}`,
                      borderRadius: '50%',
                      flexShrink: 0,
                    }}
                  >
                    <Ionicons name="bookmarks-outline" size={20} color={iconColor} />
                  </TouchableOpacity>
                </div>
              </ThemedElements>
            </div>
          </ThemedView>
        </div>
        {!teamsSelected.length && <LoadingView />}
        {displayAccordions()}
      </ScrollView>
      <Modal
        animationType="slide"
        transparent={true}
        visible={reorderModalVisible}
        onRequestClose={() => setReorderModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={[styles.modalView, { backgroundColor: modalBackgroundColor }]}>
            <Text style={[styles.modalText, { color: textColor }]}>{translateWord('filterTeams')}</Text>
            <ScrollView style={{ width: '100%', maxHeight: 400 }}>
              <TeamReorderSelector
                teams={tempTeams}
                allTeams={teams}
                maxTeams={9}
                onChange={setTempTeams}
                allowedLeagues={allowedLeagues}
              />
            </ScrollView>
            <View style={styles.buttonsContainer}>
              <Pressable style={[styles.button, styles.buttonCancel]} onPress={() => setReorderModalVisible(false)}>
                <Text style={styles.textStyle}>{translateWord('cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.buttonSave, { borderColor: textColor, borderWidth: 1 }]}
                onPress={handleSaveReorder}
              >
                <Text style={styles.textStyle}>{translateWord('register')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <ActionButton ref={ActionButtonRef} scrollViewRef={scrollViewRef} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxWidth: 500,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    flex: 1,
  },
  buttonCancel: {
    backgroundColor: '#808080',
  },
  buttonSave: {
    backgroundColor: 'black',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
