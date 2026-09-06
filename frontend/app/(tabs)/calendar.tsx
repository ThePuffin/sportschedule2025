import DateRangePicker from '@/components/DatePicker';
import FilterAccordion from '@/components/FilterAccordion';
import HomeGameToggle, { HomeGameFilter } from '@/components/HomeGameToggle';
import PageHeader from '@/components/PageHeader';
import { ThemedElements } from '@/components/ThemedElements';
import { ThemedView } from '@/components/ThemedView';
import { maxTeamsNumber } from '@/constants/Constants';
import { useAuth } from '@/context/AuthContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { fetchDateRangeFromApi, fetchTeams, getCache, saveCache } from '@/utils/fetchData';
import { syncToFirestore } from '@/utils/syncService';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
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
import Separator from '../../components/Separator';
import TeamReorderSelector from '../../components/TeamReorderSelector';
import { addDays, readableDate } from '../../utils/date';
import { getNextHomeGameFilter, getPreviousHomeGameFilter } from '../../utils/homeGameFilter';
import { FilterGames, GameFormatted, Team } from '../../utils/types';
import { getFilterAccordionLabel, translateFilterLabel, translateWord } from '../../utils/utils';
const EXPO_PUBLIC_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://sportschedule2025backend.onrender.com';

export default function Calendar() {
  const { user, firestoreReady } = useAuth();
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
  const [homeGameVisibility, setHomeGameVisibility] = useState<HomeGameFilter>('all');

  const scrollViewRef = useRef<ScrollView>(null);
  const ActionButtonRef = useRef<ActionButtonRef>(null);
  const [allowedLeagues, setAllowedLeagues] = useState<string[]>([]);
  const [reorderModalVisible, setReorderModalVisible] = useState(false);
  const isInternalChange = useRef(false);
  const [tempTeams, setTempTeams] = useState<string[]>([]);
  const [hiddenTeams, setHiddenTeams] = useState<string[]>([]);
  const [gamesModalVisible, setGamesModalVisible] = useState(false);
  const isRestoringSelectionRef = useRef(false);
  const [isTeamAccordionOpen, setIsTeamAccordionOpen] = useState(true);
  const [isDateAccordionOpen, setIsDateAccordionOpen] = useState(false);

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

  const filteredGamesSelected = useMemo(() => {
    return gamesSelected.filter(
      (game) => game.isActive && (allowedLeagues.length === 0 || allowedLeagues.includes(game.league)),
    );
  }, [gamesSelected, allowedLeagues]);

  const teamsAvailableForReorder = useMemo(() => {
    if (allowedLeagues.length === 0) return teams;
    return teams.filter((t) => allowedLeagues.includes(t.league));
  }, [teams, allowedLeagues]);

  const teamAccordionLabel = useMemo(() => {
    const labels =
      filteredTeamsSelected
        .filter((id) => !hiddenTeams.includes(id))
        .map((id) => {
          const team = teams.find((t) => t.uniqueId === id);
          return team ? team.abbrev : id;
        }) ?? [];
    const { prefix, value } = getFilterAccordionLabel({
      prefix: translateFilterLabel('team'),
      fallbackLabel: translateFilterLabel('team'),
      activeFilter: labels.join(', '),
      selectedTeam: null,
      expanded: isTeamAccordionOpen,
    });
    if (value) {
      return (
        <span
          style={{
            display: 'block',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {prefix} :{' '}
          <i>
            <b>{value}</b>
          </i>
        </span>
      );
    }
    return prefix;
  }, [filteredTeamsSelected, hiddenTeams, teams, isTeamAccordionOpen]);

  const initializeDateRange = async () => {
    const apiRange = await fetchDateRangeFromApi();
    const apiMinDate = apiRange.minDate ? new Date(apiRange.minDate) : new Date();
    const apiMaxDate = apiRange.maxDate ? new Date(apiRange.maxDate) : new Date(addDays(apiMinDate, 365));

    apiMinDate.setHours(0, 0, 0, 0);
    apiMaxDate.setHours(23, 59, 59, 999);

    const storedStartDate = localStorage.getItem('startDate');
    const storedEndDate = localStorage.getItem('endDate');

    let beginDate = storedStartDate ? new Date(storedStartDate) : new Date();
    let endDate = storedEndDate ? new Date(storedEndDate) : new Date(addDays(beginDate, 15));

    if (beginDate < apiMinDate) {
      beginDate = new Date(apiMinDate);
    }

    if (endDate > apiMaxDate) {
      endDate = new Date(apiMaxDate);
    }

    if (beginDate > endDate) {
      endDate = new Date(addDays(beginDate, 15));
      if (endDate > apiMaxDate) endDate = new Date(apiMaxDate);
    }

    beginDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const startStr = beginDate.toISOString();
    const endStr = endDate.toISOString();

    if (startStr !== storedStartDate) {
      localStorage.setItem('startDate', startStr);
    }
    if (endStr !== storedEndDate) {
      localStorage.setItem('endDate', endStr);
    }

    if (startStr !== storedStartDate || endStr !== storedEndDate) {
      setDateRange({
        startDate: beginDate,
        endDate: endDate,
      });
      getGamesFromApi(startStr, endStr);
    }
  };

  const [dateRange, setDateRange] = useState({
    startDate: new Date(localStorage.getItem('startDate') || new Date().toISOString()),
    endDate: new Date(localStorage.getItem('endDate') || new Date(addDays(new Date(), 15)).toISOString()),
  });

  const dateAccordionLabel = useMemo(() => {
    const startLabel = dateRange.startDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const endLabel = dateRange.endDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const period = `${startLabel} - ${endLabel}`;
    const { prefix, value } = getFilterAccordionLabel({
      prefix: translateWord('selectYourDates'),
      fallbackLabel: translateWord('selectYourDates'),
      activeFilter: period,
      selectedTeam: null,
      expanded: isDateAccordionOpen,
    });
    if (value) {
      return (
        <span
          style={{
            display: 'block',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {prefix} :{' '}
          <i>
            <b>{value}</b>
          </i>
        </span>
      );
    }
    return prefix;
  }, [dateRange, isDateAccordionOpen]);

  const storeTeamsSelected = useCallback(
    async (teamsSelectedIds: string[], teamsList?: Team[], syncToDB: boolean = true) => {
      const filteredTeams = teamsSelectedIds.filter((teamId, i) => teamId && i < maxTeamsNumber);
      setTeamsSelected(filteredTeams);
      const listToSearch = teamsList && teamsList.length > 0 ? teamsList : teams;
      const selectedTeams = filteredTeams
        .map((teamId) => {
          const team = listToSearch.find((team) => team.uniqueId === teamId);
          return team;
        })
        .filter(Boolean);

      if (selectedTeams.length !== 0) {
        saveCache('teamsSelected', selectedTeams);
      }

      const newGamesSelection = gamesSelected.filter(
        (game) => filteredTeams.includes(game.homeTeamId) || filteredTeams.includes(game.awayTeamId),
      );
      const selectionPruned = newGamesSelection.length !== gamesSelected.length;

      if (selectionPruned) {
        isInternalChange.current = true;
        setGamesSelected(newGamesSelection);
        saveCache('gameSelected', newGamesSelection);
        if (globalThis.window !== undefined && !isRestoringSelectionRef.current) {
          globalThis.window.dispatchEvent(new Event('gamesSelectedUpdated'));
        }
      }

      if (user && syncToDB) {
        // Debounced replication to Firestore; errors are handled gracefully inside syncService
        syncToFirestore(user.uid, {
          teamsSelected: filteredTeams,
          ...(selectionPruned && { gameSelected: newGamesSelection }),
        });
      }
    },
    [teams, gamesSelected, user],
  );

  const getSelectedTeams = useCallback(
    (allTeams: Team[] = [], shouldSyncDB: boolean = true) => {
      if (!allTeams.length) return;
      isRestoringSelectionRef.current = true;

      try {
        const cached = getCache<Team[]>('teamsSelected');
        let selection = cached?.length ? cached.map((t) => t.uniqueId) : [];

        if (selection.length === 0) {
          const favoriteTeams = getCache<string[]>('favoriteTeams')?.filter((team) => team !== '') || [];
          if (favoriteTeams.length) {
            for (const favTeamId of favoriteTeams) {
              if (allTeams.some((team) => team.uniqueId === favTeamId)) {
                selection.push(favTeamId);
              }
            }
          }
        }

        if (selection.length === 0) {
          setTempTeams([]);
          setReorderModalVisible(true);
          storeTeamsSelected([], allTeams, shouldSyncDB);
          return;
        }

        storeTeamsSelected(selection, allTeams, shouldSyncDB);
      } finally {
        isRestoringSelectionRef.current = false;
      }
    },
    [allowedLeagues, storeTeamsSelected],
  );

  const getStoredGames = useCallback(() => {
    const storedGamesDataRaw = getCache<FilterGames>('gamesData');
    if (!storedGamesDataRaw || !Object.keys(storedGamesDataRaw).length) return {};

    const begindateStr = dateRange.startDate.toISOString().split('T')[0];

    const filteredGamesData = Object.fromEntries(
      Object.entries(storedGamesDataRaw).filter(([date]) => date >= begindateStr),
    );

    return filteredGamesData;
  }, [dateRange.startDate]);

  const getStoredTeams = useCallback(() => {
    isRestoringSelectionRef.current = true;

    try {
      // Try to fetch the global teams list from cache if state is empty
      const allTeams = teams.length > 0 ? teams : getCache<Team[]>('teams') || [];

      if (allTeams.length > 0) {
        if (teams.length === 0) {
          setTeams(allTeams);
        }
        // Delegate selection logic (DB -> Favorites -> Random) to getSelectedTeams
        getSelectedTeams(allTeams, false); // false = don't sync to DB on load

        setGames(getStoredGames() as FilterGames);

        const storedGamesSelected = getCache<GameFormatted[]>('gameSelected') ?? [];
        const today = new Date().toISOString().split('T')[0];
        const gamesSelectedFromStorage = storedGamesSelected.filter((game) => game.gameDate >= today);
        setGamesSelected(gamesSelectedFromStorage);
        saveCache('gameSelected', gamesSelectedFromStorage);
      }
    } finally {
      isRestoringSelectionRef.current = false;
    }
  }, [teams, getSelectedTeams, getStoredGames]);

  const getTeamsFromApi = useCallback(async (): Promise<Team[]> => {
    try {
      const allTeams = await fetchTeams();
      saveCache('teams', allTeams);
      getSelectedTeams(allTeams, false);
      return allTeams;
    } catch (error: unknown) {
      console.error(error);
      return [];
    }
  }, [getSelectedTeams]);

  const getGamesFromApi = useCallback(
    async (startDate: string | undefined = undefined, endDate: string | undefined = undefined): Promise<void> => {
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
        } catch (error: unknown) {
          console.error(error);
        }
      }
    },
    [teamsSelected, dateRange],
  );

  const handleDateChange = async (startDate: Date, endDate: Date) => {
    setGames({});
    const start = startDate.toISOString();
    const end = endDate.toISOString();
    localStorage.setItem('startDate', start);
    localStorage.setItem('endDate', end);
    await getGamesFromApi(start, end);
    setDateRange({ startDate, endDate });

    const startStr = readableDate(startDate);
    const endStr = readableDate(endDate);

    const newGamesSelection = gamesSelected.filter((gameSelected) => {
      return gameSelected.gameDate >= startStr && gameSelected.gameDate <= endStr;
    });
    setGamesSelected(newGamesSelection);
    saveCache('gameSelected', newGamesSelection);
    if (globalThis.window !== undefined) {
      globalThis.window.dispatchEvent(new Event('gamesSelectedUpdated'));
    }

    if (user) {
      // Debounced replication to Firestore; errors are handled gracefully inside syncService
      syncToFirestore(user.uid, {
        startDate: start,
        endDate: end,
        gameSelected: newGamesSelection,
      });
    }
  };

  const handleGamesSelection = useCallback(
    async (game: GameFormatted) => {
      let newSelection = [...gamesSelected];

      const isMatch = (g: GameFormatted) => {
        const sameTeams = g.homeTeamId === game.homeTeamId && g.awayTeamId === game.awayTeamId;
        if (!sameTeams) return false;

        const d1 = new Date(g.startTimeUTC);
        const d2 = new Date(game.startTimeUTC);
        return (
          d1.getUTCFullYear() === d2.getUTCFullYear() &&
          d1.getUTCMonth() === d2.getUTCMonth() &&
          d1.getUTCDate() === d2.getUTCDate() &&
          d1.getUTCHours() === d2.getUTCHours()
        );
      };

      const wasAdded = gamesSelected.some(isMatch);

      if (wasAdded) {
        newSelection = newSelection.filter((g) => !isMatch(g));
      } else {
        if (gamesSelected.length >= 10) {
          return;
        }
        newSelection.push(game);
        newSelection = newSelection.sort((a: GameFormatted, b: GameFormatted) => {
          return new Date(a.startTimeUTC).getTime() - new Date(b.startTimeUTC).getTime();
        });
      }

      setGamesSelected(newSelection);
      saveCache('gameSelected', newSelection);
      if (globalThis.window !== undefined) {
        globalThis.window.dispatchEvent(new Event('gamesSelectedUpdated'));
      }

      if (user) {
        // Debounced replication to Firestore; errors are handled gracefully inside syncService
        syncToFirestore(user.uid, { gameSelected: newSelection });
      }
    },
    [gamesSelected, user],
  );

  const handleOpenReorder = () => {
    const availableIds = new Set(teamsAvailableForReorder.map((t) => t.uniqueId));
    const validTeams = teamsSelected.filter((id) => availableIds.has(id));
    setTempTeams(validTeams);
    setReorderModalVisible(true);
  };

  const handleSaveReorder = () => {
    storeTeamsSelected(tempTeams);
    setReorderModalVisible(false);
  };

  const handleClearGamesSelection = useCallback(async () => {
    setGamesSelected([]);
    saveCache('gameSelected', []);
    if (globalThis.window !== undefined) {
      globalThis.window.dispatchEvent(new Event('gamesSelectedUpdated'));
    }

    if (user) {
      // Debounced replication to Firestore; errors are handled gracefully inside syncService
      syncToFirestore(user.uid, { gameSelected: [] });
    }
  }, [user]);

  useEffect(() => {
    const refreshData = () => {
      if (isInternalChange.current) {
        isInternalChange.current = false;
        return;
      }
      if (isRestoringSelectionRef.current) {
        return;
      }
      getStoredTeams();
    };
    if (globalThis.window !== undefined) {
      globalThis.window.addEventListener('favoritesUpdated', refreshData);
      globalThis.window.addEventListener('gamesSelectedUpdated', refreshData);
      globalThis.window.addEventListener('teamsSelectedUpdated', refreshData);
      return () => {
        globalThis.window.removeEventListener('favoritesUpdated', refreshData);
        globalThis.window.removeEventListener('gamesSelectedUpdated', refreshData);
        globalThis.window.removeEventListener('teamsSelectedUpdated', refreshData);
      };
    }
  }, [getStoredTeams]);

  useEffect(() => {
    const updateDateRange = () => {
      const start = localStorage.getItem('startDate');
      const end = localStorage.getItem('endDate');
      if (start && end) {
        setDateRange({ startDate: new Date(start), endDate: new Date(end) });
        getGamesFromApi(start, end);
      }
    };
    if (globalThis.window !== undefined) {
      globalThis.window.addEventListener('dateRangeUpdated', updateDateRange);
      return () => globalThis.window.removeEventListener('dateRangeUpdated', updateDateRange);
    }
  }, [getGamesFromApi]);

  useEffect(() => {
    if (gamesModalVisible && filteredGamesSelected.length === 0) {
      setGamesModalVisible(false);
    }
  }, [filteredGamesSelected, gamesModalVisible]);

  const displayAccordions = () => {
    if (!games || Object.keys(games).length === 0) return null;

    const sortedDates = Object.keys(games).sort((a, b) => a.localeCompare(b));

    return sortedDates.map((date, index) => {
      const startStr = readableDate(dateRange.startDate);
      const endStr = readableDate(dateRange.endDate);

      if (date < startStr || date > endStr) return null;

      const gamesForDate = games[date].filter(
        (g) =>
          g.isActive !== false &&
          filteredTeamsSelected.includes(g.teamSelectedId) &&
          !hiddenTeams.includes(g.teamSelectedId),
      );

      if (gamesForDate.length === 0) return null;

      const [year, month, day] = date.split('-').map(Number);
      const gameDate = new Date(year, month - 1, day);

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
            homeGameVisibility={homeGameVisibility}
          />
        </div>
      );
    });
  };

  useEffect(() => {
    if (!firestoreReady) return;
    initializeDateRange();
    getStoredTeams();
  }, [firestoreReady]);

  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  useEffect(() => {
    if (!firestoreReady) return;
    async function fetchTeams() {
      const teamsData = await getTeamsFromApi();
      setTeams(teamsData);
    }
    fetchTeams();
  }, [firestoreReady]);

  const handleHomeGameToggle = (value: HomeGameFilter) => {
    setHomeGameVisibility(value);
  };

  useEffect(() => {
    if (teamsSelected.length > 0) {
      async function fetchGames() {
        await getGamesFromApi();
      }
      fetchGames();
    }
  }, [teamsSelected, teams]);

  // Swipe gesture to cycle through home / all / away filters
  const swipePanResponder = useMemo(() => {
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture horizontal swipes (ignore vertical scroll)
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -30) {
          // Swipe left → next filter
          handleHomeGameToggle(getNextHomeGameFilter(homeGameVisibility));
        } else if (gestureState.dx > 30) {
          // Swipe right → previous filter
          handleHomeGameToggle(getPreviousHomeGameFilter(homeGameVisibility));
        }
      },
    });
  }, [homeGameVisibility, handleHomeGameToggle]);

  return (
    <ThemedView style={{ flex: 1 }} {...swipePanResponder.panHandlers}>
      <PageHeader rightElement={<HomeGameToggle value={homeGameVisibility} onValueChange={handleHomeGameToggle} />} />
      <ScrollView
        ref={scrollViewRef}
        onScroll={(event) => ActionButtonRef.current?.handleScroll(event)}
        scrollEventThrottle={16}
      >
        <div style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <ThemedView style={{ backgroundColor }}>
            <div style={{ width: '100%', padding: isSmallDevice ? 0 : 10, boxSizing: 'border-box' }}>
              <FilterAccordion
                label={teamAccordionLabel}
                defaultOpen={true}
                isSmallDevice={isSmallDevice}
                onExpandedChange={setIsTeamAccordionOpen}
              >
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
                        borderWidth: 1,
                        borderColor: iconColor,
                        borderStyle: 'solid',
                        borderRadius: 20,
                        flexShrink: 0,
                        zIndex: 20, // stays above the slider, which extends underneath it
                      }}
                    >
                      <MaterialIcons name="playlist-add" size={24} color={iconColor} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: -50, marginRight: -50 }}>
                      <FilterSlider
                        scrollPaddingLeft={50} // compensates the negative margins: chips rest at the same position
                        scrollPaddingRight={50}
                        fadeLeftInset={40} // playlist button spans the first 40px of the ScrollView
                        fadeRightInset={50} // bookmark button spans the last 50px of the ScrollView
                        multipleSelection={true}
                        disableSort={true}
                        data={filteredTeamsSelected
                          .map((id) => teams.find((t) => t.uniqueId === id))
                          .filter((t): t is Team => !!t)
                          .map((t) => ({ label: t.label, value: t.uniqueId }))}
                        selectedFilters={filteredTeamsSelected.filter((id) => !hiddenTeams.includes(id))}
                        onFilterChange={(val) => {
                          setHiddenTeams((prev) =>
                            prev.includes(val) ? prev.filter((id) => id !== val) : [...prev, val],
                          );
                        }}
                      />
                    </View>

                    <TouchableOpacity
                      disabled={filteredGamesSelected.length === 0}
                      onPress={() => filteredGamesSelected.length > 0 && setGamesModalVisible(true)}
                      style={{
                        position: 'relative',
                        width: 40,
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: 10,
                        backgroundColor,
                        borderWidth: 1,
                        borderColor: iconColor,
                        borderStyle: 'solid',
                        borderRadius: 20,
                        flexShrink: 0,
                        zIndex: 20, // stays above the slider, which extends underneath it
                      }}
                    >
                      <Ionicons
                        name={filteredGamesSelected.length > 0 ? 'bookmarks' : 'bookmarks-outline'}
                        size={20}
                        color={iconColor}
                      />
                    </TouchableOpacity>
                  </div>
                </ThemedElements>
              </FilterAccordion>
              <FilterAccordion
                label={dateAccordionLabel}
                defaultOpen={true}
                isSmallDevice={isSmallDevice}
                onExpandedChange={setIsDateAccordionOpen}
              >
                <ThemedElements style={{ zIndex: 20 }}>
                  <div style={{ position: 'relative' }}>
                    <DateRangePicker dateRange={dateRange} onDateChange={handleDateChange} />
                  </div>
                </ThemedElements>
              </FilterAccordion>
              {!isSmallDevice || isDateAccordionOpen ? (
                <ThemedElements style={{ paddingTop: 10, paddingBottom: 10 }}>
                  <Separator />
                </ThemedElements>
              ) : null}
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
                allTeams={teamsAvailableForReorder}
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
      <Modal
        animationType="fade"
        transparent={true}
        visible={gamesModalVisible}
        onRequestClose={() => setGamesModalVisible(false)}
      >
        <Pressable style={styles.centeredView} onPress={() => setGamesModalVisible(false)}>
          <Pressable
            style={[styles.modalView, { backgroundColor: modalBackgroundColor, maxHeight: '80%', minWidth: '75%' }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                width: '100%',
                marginBottom: 10,
                alignItems: 'center',
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  handleClearGamesSelection();
                  setGamesModalVisible(false);
                }}
                style={{
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: 15,
                  borderWidth: 1,
                  borderColor: iconColor,
                  width: 30,
                  height: 30,
                  backgroundColor: 'transparent',
                }}
              >
                <Ionicons name="trash" size={16} color={iconColor} />
              </TouchableOpacity>
              <Text style={[styles.modalText, { color: textColor, marginBottom: 0 }]}>
                {translateWord('favorites')}
              </Text>
              <TouchableOpacity onPress={() => setGamesModalVisible(false)}>
                <Ionicons name="close" size={24} color={iconColor} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ width: '100%' }}>
              {isSmallDevice && filteredGamesSelected.length === 1 ? (
                <Accordion
                  gamesFiltred={filteredGamesSelected}
                  open={true}
                  showDate={true}
                  gamesSelected={filteredGamesSelected}
                  onSelection={handleGamesSelection}
                  disableToggle={true}
                />
              ) : (
                <GamesSelected
                  onAction={handleGamesSelection}
                  data={filteredGamesSelected}
                  teamNumber={filteredGamesSelected.length}
                />
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
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
  floatingButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
