import AppLogo from '@/components/AppLogo';
import FilterSlider from '@/components/FilterSlider';
import NoResults from '@/components/NoResults';
import TeamFilter from '@/components/TeamFilter';
import { ThemedElements } from '@/components/ThemedElements';
import { ThemedView } from '@/components/ThemedView';
import { useFavoriteColor } from '@/hooks/useFavoriteColor';
import { getRandomTeamId, randomNumber, translateWord } from '@/utils/utils';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, useColorScheme, useWindowDimensions } from 'react-native';
import Accordion from '../../components/Accordion'; // Added import
import { ActionButton, ActionButtonRef } from '../../components/ActionButton';
import CardLarge from '../../components/CardLarge';
import { ColumnData } from '../../components/ColumnsLayout';
import LoadingView from '../../components/LoadingView';
import PreviousScoreToggle from '../../components/PreviousScoreToggle';
import Separator from '../../components/Separator';
import {
  fetchLeagues,
  fetchRemainingGamesByLeague,
  fetchRemainingGamesByTeam,
  fetchResultsByLeague,
  fetchResultsByTeam,
  fetchTeams,
  getCache,
  saveCache,
  smallFetchRemainingGamesByLeague,
} from '../../utils/fetchData';
import { FilterGames, GameFormatted, Team } from '../../utils/types';

const mergeGames = (initial: FilterGames, remaining: FilterGames): FilterGames => {
  const merged = { ...initial };
  Object.keys(remaining).forEach((date) => {
    if (merged[date]) {
      const existingIds = new Set(merged[date].map((g) => g.uniqueId));
      const newGames = remaining[date].filter((g) => !existingIds.has(g.uniqueId));
      merged[date] = [...merged[date], ...newGames].sort(
        (a, b) => new Date(a.startTimeUTC).getTime() - new Date(b.startTimeUTC).getTime(),
      );
    } else {
      merged[date] = remaining[date];
    }
  });
  return merged;
};

export default function Schedule() {
  const router = useRouter();
  const { league: leagueParam, team: teamParam } = useLocalSearchParams<{ league: string; team: string }>();
  const [games, setGames] = useState<FilterGames>({});
  const [results, setResults] = useState<FilterGames>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamSelected, setTeamSelected] = useState<string>('');
  const [gamesTeamId, setGamesTeamId] = useState<string>('');
  const [teamFilter, setTeamFilter] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string[]>([]);
  const [leagueTeams, setLeagueTeams] = useState<Team[]>([]);
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const { backgroundColor: selectedBackgroundColor } = useFavoriteColor('#3b82f6');
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>(() => getCache<string[]>('favoriteTeams') || []);
  const isSmallDevice = width <= 768;
  const [leaguesAvailable, setLeaguesAvailable] = useState<string[]>([]);
  const [leagueOfSelectedTeam, setleagueOfSelectedTeam] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPreviousScores, setShowPreviousScores] = useState<boolean>(
    () => getCache<boolean>('showPreviousScores') || false,
  );

  const isInternalChange = useRef(false);
  const handlePreviousScoreToggle = useCallback((value: boolean) => {
    setShowPreviousScores(value);
    saveCache('showPreviousScores', value);
    if (!value) {
      setResults({});
    }
  }, []);
  const scrollViewRef = useRef<ScrollView>(null);
  const ActionButtonRef = useRef<ActionButtonRef>(null);
  const [focusCount, setFocusCount] = useState(0);
  const accordionRefs = useRef<Array<HTMLDivElement | null>>([]);

  const teamsForSelector = useMemo(() => {
    return [...leagueTeams];
  }, [leagueTeams]);

  useEffect(() => {
    // If we're coming from another tab or initial load, ensure params match what's in state/LS if empty
    if (!leagueParam && leagueOfSelectedTeam) {
      router.setParams({ league: leagueOfSelectedTeam, team: teamSelected });
    }
  }, []);

  const allOption = {
    uniqueId: 'all',
    label: 'All',
    id: 'all',
    value: 'all',
    teamLogo: '',
    teamCommonName: 'All',
    conferenceName: '',
    divisionName: '',
    league: leagueOfSelectedTeam,
    abbrev: 'ALL',
    updateDate: '',
  } as Team;

  useEffect(() => {
    const updateLeagues = () => {
      const stored = getCache<string[]>('leaguesSelected');
      if (stored) setLeaguesAvailable(stored);
    };
    if (globalThis.window !== undefined) {
      globalThis.window.addEventListener('leaguesUpdated', updateLeagues);
      return () => globalThis.window.removeEventListener('leaguesUpdated', updateLeagues);
    }
  }, []);

  useEffect(() => {
    const updateFavorites = () => {
      setFavoriteTeams(getCache<string[]>('favoriteTeams') || []);
    };
    if (globalThis.window !== undefined) {
      globalThis.window.addEventListener('favoritesUpdated', updateFavorites);
      return () => globalThis.window.removeEventListener('favoritesUpdated', updateFavorites);
    }
  }, []);

  useEffect(() => {
    async function fetchTeamsAndRestore() {
      // try cached teams first
      const cachedTeams = getCache<Team[]>('teams');

      if (isInternalChange.current) {
        isInternalChange.current = false;
        // If it was an internal change, we still might need to fetch if teams are empty
        if (!teams.length && !cachedTeams) {
          const teamsData: Team[] = await fetchTeams();
          setTeams(teamsData);
        }
        return;
      }

      const teamSelectedLS = localStorage.getItem('teamSelected') || '';
      const storedLeagues = getCache<string[]>('leaguesSelected') || [];

      let forcedLeague = '';
      if (leagueParam) {
        const param = (Array.isArray(leagueParam) ? leagueParam[0] : leagueParam).toUpperCase();
        forcedLeague = param;
      }

      let forcedTeam = '';
      if (teamParam) {
        forcedTeam = Array.isArray(teamParam) ? teamParam[0] : teamParam;
      }

      let foundTeam = cachedTeams?.find((t) => t.uniqueId === teamSelectedLS);

      if (!foundTeam || (storedLeagues.length > 0 && !storedLeagues.includes(foundTeam.league))) {
        const favoriteTeams = getCache<string[]>('favoriteTeams') || [];
        if (favoriteTeams.length > 0) {
          const favoriteTeam = cachedTeams?.find((t) => t.uniqueId === favoriteTeams[0]);
          if (favoriteTeam) {
            foundTeam = favoriteTeam;
            localStorage.setItem('teamSelected', foundTeam.uniqueId);
          }
        }
      }

      const selectedTeam = foundTeam || ({} as Team);

      try {
        if (cachedTeams) {
          setLeaguesAvailable([selectedTeam.league]);
          setTeams([selectedTeam]);
          getSelectedTeams(cachedTeams, forcedLeague, forcedTeam);
        }
        const teamsData: Team[] = await fetchTeams();
        setTeams(teamsData);
        // cache teams for offline/cold-start
        saveCache('teams', teamsData);
        // restore selection using freshly fetched teams
        getSelectedTeams(teamsData, forcedLeague, forcedTeam);
      } catch (err) {
        console.error('fetch teams failed, using cached teams if available', err);
        if (cachedTeams) {
          setTeams(cachedTeams);
          getSelectedTeams(cachedTeams, forcedLeague, forcedTeam);
        } else {
          // fallback: try to restore selection from persisted keys (teams unknown)
          getStoredData();
        }
      }
      // optionally fetch leagues
      if (leaguesAvailable.length === 0) {
        const storedLeagues = getCache<string[]>('leaguesSelected');
        if (storedLeagues && storedLeagues.length > 0) {
          setLeaguesAvailable(storedLeagues);
        } else {
          fetchLeagues(setLeaguesAvailable);
        }
      }
    }
    fetchTeamsAndRestore();
  }, [leagueParam, teamParam]);

  useFocusEffect(
    useCallback(() => {
      setFocusCount((c) => c + 1);
    }, []),
  );

  useEffect(() => {
    if (teamSelected && teamSelected.length > 0 && leagueOfSelectedTeam && leagueOfSelectedTeam.length > 0) {
      async function fetchGames() {
        await getGamesFromApi();
      }
      fetchGames();
    }
  }, [teamSelected, teams, showPreviousScores]);

  const getSelectedTeams = (allTeams: Team[], forcedLeague?: string, forcedTeam?: string) => {
    let selection = forcedTeam || localStorage.getItem('teamSelected') || '';
    let leagueToSet = '';

    if (forcedLeague) {
      const validLeague = allTeams.some((t) => t.league === forcedLeague);
      const storedLeagues = getCache<string[]>('leaguesSelected') || [];
      const isAvailable = storedLeagues.length === 0 || storedLeagues.includes(forcedLeague);

      if (validLeague && isAvailable) {
        leagueToSet = forcedLeague;
        const storedTeamsLeagues = getCache<{ [key: string]: string }>('teamsSelectedLeagues') || {};
        if (storedTeamsLeagues[forcedLeague]) {
          selection = forcedTeam || storedTeamsLeagues[forcedLeague];
        } else {
          const favoriteTeams = getCache<string[]>('favoriteTeams') || [];
          const teamsInLeague = allTeams.filter((t) => t.league === forcedLeague);
          const fav = favoriteTeams.find((fid) => teamsInLeague.some((t) => t.uniqueId === fid));
          if (fav) {
            selection = fav;
          } else {
            selection = 'all';
          }
        }
        if (selection === 'all') {
          localStorage.setItem('leagueSelected', forcedLeague);
        }
      }
    }

    if (!leagueToSet && selection.length === 0) {
      const teamsSelected = getCache<Team[]>('teamsSelected');

      let teamsSelectedIds = teamsSelected || [];
      let randomTeam = getRandomTeamId(allTeams) || '';

      if (teamsSelectedIds.length > 0) {
        selection = teamsSelectedIds[0]?.uniqueId || randomTeam;
      } else {
        const favoriteTeams = getCache<string[]>('favoriteTeams')?.filter((team) => team !== '') || [];
        selection = favoriteTeams.length > 0 ? favoriteTeams[0] : randomTeam;
      }
    }
    // pass the freshly fetched teams so we can derive league immediately
    storeTeamSelected(selection, allTeams);
  };

  const getStoredData = () => {
    const leagueSelection = localStorage.getItem('leagueSelected') ?? '';
    setleagueOfSelectedTeam(leagueSelection);
    const teamSelection = localStorage.getItem('teamSelected') ?? '';
    if (teamSelection) {
      // if called when teams are already loaded, pass them to derive league
      storeTeamSelected(teamSelection, teams);
      const scheduleData = getCache<FilterGames>('scheduleData');
      if (scheduleData) {
        const storedGames = scheduleData;
        const today = new Date().toISOString().split('T')[0];
        const filteredGames = Object.fromEntries(
          Object.entries(storedGames)
            .filter(([date]) => date >= today)
            .map(([date, games]) => [date, games as GameFormatted[]]),
        ) as FilterGames;
        setGames(filteredGames);
        setGamesTeamId(teamSelection);
      }
    } else {
      setTeamSelected(teamSelection);
    }
  };

  const persistTeamForLeague = (league: string, teamSelectedId: string) => {
    const leaguesTeams = getCache<{ [key: string]: string }>('teamsSelectedLeagues') || {};
    leaguesTeams[league] = teamSelectedId;
    saveCache('teamsSelectedLeagues', leaguesTeams);
  };

  const handleTeamSelectionChange = (teamSelectedId: string | string[]) => {
    setTeamFilter('');
    setMonthFilter([]);
    const finalTeamId = Array.isArray(teamSelectedId) ? teamSelectedId[0] : teamSelectedId;
    isInternalChange.current = true;
    router.setParams({ team: finalTeamId });
    if (finalTeamId === 'all') {
      localStorage.setItem('teamSelected', 'all');
      setTeamSelected('all');
    } else {
      storeTeamSelected(finalTeamId, teams);
    }
    persistTeamForLeague(leagueOfSelectedTeam, finalTeamId);
  };

  const handleTeamFilterChange = (teamSelectedId: string | string[]) => {
    setTeamFilter(Array.isArray(teamSelectedId) ? teamSelectedId[0] : teamSelectedId);
  };

  const handleLeagueSelectionChange = (leagueSelectedId: string | string[]) => {
    setTeamFilter('');
    setMonthFilter([]);
    const finalLeagueId = Array.isArray(leagueSelectedId) ? leagueSelectedId[0] : leagueSelectedId;
    isInternalChange.current = true;
    router.setParams({ league: finalLeagueId });
    localStorage.setItem('leagueSelected', finalLeagueId);
    const teamsAvailableInLeague = teams.filter(({ league }) => league === finalLeagueId);
    allOption.league = finalLeagueId;
    setLeagueTeams([allOption, ...teamsAvailableInLeague]);
    setleagueOfSelectedTeam(finalLeagueId);
    const storedTeamsLeagues = getCache<{ [key: string]: string }>('teamsSelectedLeagues') || {};
    let team = '';
    if (storedTeamsLeagues[finalLeagueId]) {
      team = storedTeamsLeagues[finalLeagueId];
    }

    if (team.length === 0) {
      const favoriteTeams = getCache<string[]>('favoriteTeams')?.filter((team) => team !== '') || [];
      const favoriteInLeague = favoriteTeams.find((favId) => teamsAvailableInLeague.some((t) => t.uniqueId === favId));
      if (favoriteInLeague) {
        team = favoriteInLeague;
      } else {
        team = teamsAvailableInLeague.length
          ? teamsAvailableInLeague[randomNumber(teamsAvailableInLeague.length - 1)].uniqueId
          : 'all';
      }
    }
    localStorage.setItem('teamSelected', team);
    router.setParams({ league: finalLeagueId, team: team });
    setTeamSelected(team);
  };

  useEffect(() => {
    if (leaguesAvailable.length > 0 && leagueOfSelectedTeam && !leaguesAvailable.includes(leagueOfSelectedTeam)) {
      const favoriteTeams = getCache<string[]>('favoriteTeams') || [];
      let nextLeague = '';

      for (const favId of favoriteTeams) {
        const favTeam = teams.find((t) => t.uniqueId === favId);
        if (favTeam && leaguesAvailable.includes(favTeam.league)) {
          nextLeague = favTeam.league;
          break;
        }
      }

      if (!nextLeague) {
        nextLeague = leaguesAvailable[randomNumber(leaguesAvailable.length - 1)];
      }
      handleLeagueSelectionChange(nextLeague);
    }
  }, [leaguesAvailable, leagueOfSelectedTeam, teams]);

  const visibleGamesByMonth = useMemo(() => {
    let allGames = mergeGames(results, games);

    const today = new Date().toISOString().split('T')[0];
    if (!allGames || (Object.keys(allGames).length === 1 && (allGames[today]?.[0]?.updateDate ?? '')) === '') {
      return [];
    }

    let subFilteredGames = Object.fromEntries(
      Object.entries(allGames).map(([date, dayGames]) => [
        date,
        dayGames.filter((g) => g && (g.isActive || g.homeTeamScore !== null)),
      ]),
    ) as FilterGames;

    if (teamFilter && teamFilter !== '') {
      const filterNameGame = teamFilter === 'NHL-UTAH' ? 'NHL-UTA' : teamFilter;
      subFilteredGames = Object.fromEntries(
        Object.entries(subFilteredGames)
          .map(([date, dayGames]) => [
            date,
            dayGames.filter((g) => g && (g.homeTeamId === filterNameGame || g.awayTeamId === filterNameGame)),
          ])
          .filter(([_, filteredDayGames]) => (filteredDayGames as GameFormatted[]).length > 0),
      ) as FilterGames;
    }

    let filteredGamesDates = Object.keys(subFilteredGames).filter((day: string) => {
      return (
        Array.isArray(subFilteredGames[day]) && subFilteredGames[day].some((game: GameFormatted) => game.updateDate)
      );
    });

    const months = filteredGamesDates.reduce((acc: { [key: string]: string[] }, day: string) => {
      const month = new Date(day).toLocaleString('default', { month: 'long' });
      if (!acc[month]) {
        acc[month] = [];
      }
      acc[month].push(day);
      return acc;
    }, {});

    return Object.entries(months)
      .map(([month, daysInMonth]) => {
        const gamesForThisMonth: GameFormatted[] = daysInMonth.reduce((acc: GameFormatted[], day: string) => {
          const dayGames = Array.isArray(subFilteredGames[day]) ? subFilteredGames[day] : [];
          if (gamesTeamId === 'all') {
            if (dayGames.length) {
              acc.push(...dayGames);
            }
          } else {
            const gameOnDay = dayGames.find((game: GameFormatted) => game.teamSelectedId === gamesTeamId);
            if (gameOnDay) {
              acc.push(gameOnDay);
            }
          }
          return acc;
        }, []);
        return { month, games: gamesForThisMonth };
      })
      .filter((item) => item.games.length > 0);
  }, [games, results, teamFilter, gamesTeamId]);

  const scrollTargetId = useMemo(() => {
    if (visibleGamesByMonth.length === 0) return null;

    // Try to find the first upcoming game (without score)
    for (const m of visibleGamesByMonth) {
      const game = m.games.find((g) => g.homeTeamScore === null || g.awayTeamScore === null);
      if (game) return game.uniqueId;
    }

    // If only results are displayed, target the last one
    const lastMonth = visibleGamesByMonth[visibleGamesByMonth.length - 1];
    if (lastMonth && lastMonth.games.length > 0) {
      return lastMonth.games[lastMonth.games.length - 1].uniqueId;
    }

    return null;
  }, [visibleGamesByMonth]);

  const monthToFocusIndex = useMemo(() => {
    if (!scrollTargetId) return -1;
    return visibleGamesByMonth.findIndex((m) => m.games.some((g) => g.uniqueId === scrollTargetId));
  }, [visibleGamesByMonth, scrollTargetId]);

  useEffect(() => {
    if (teamFilter === '' && scrollTargetId && !isLoading && !monthFilter.length) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`game-${scrollTargetId}`);
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [scrollTargetId, isLoading, monthFilter.length, focusCount, teamFilter]);

  const uniqueTeamsFromGames = useMemo(() => {
    if (teamSelected === 'all' && monthFilter.length === 0) {
      return teamsForSelector.filter((team) => team.uniqueId !== teamSelected);
    }
    const teamsFromGames: Team[] = [];
    const seenIds = new Set<string>();
    const allGames = showPreviousScores ? mergeGames(results, games) : games;
    for (const day in allGames) {
      if (!Object.hasOwn(allGames, day)) continue;
      if (monthFilter.length > 0) {
        const month = new Date(day).toLocaleString('default', { month: 'long' });
        if (!monthFilter.includes(month)) continue;
      }

      const dayGames = allGames[day];
      if (!Array.isArray(dayGames)) continue;

      dayGames.forEach((game) => {
        const { homeTeam, awayTeam, league, homeTeamId, awayTeamId } = game;
        if (homeTeam && !seenIds.has(homeTeamId) && homeTeamId !== teamSelected) {
          seenIds.add(homeTeamId);
          teamsFromGames.push({
            label: homeTeam,
            league,
            uniqueId: homeTeamId,
            value: homeTeamId,
            id: homeTeamId,
            teamLogo: '',
            teamCommonName: homeTeam,
            conferenceName: '',
            divisionName: '',
            abbrev: '',
            updateDate: '',
          });
        }
        if (awayTeam && !seenIds.has(awayTeamId) && awayTeamId !== teamSelected) {
          seenIds.add(awayTeamId);
          teamsFromGames.push({
            label: awayTeam,
            league,
            uniqueId: awayTeamId,
            value: awayTeamId,
            id: awayTeamId,
            teamLogo: '',
            teamCommonName: awayTeam,
            conferenceName: '',
            divisionName: '',
            abbrev: '',
            updateDate: '',
          });
        }
      });
    }
    return teamsFromGames.sort((a, b) => a.label.localeCompare(b.label));
  }, [games, results, teamSelected, monthFilter, teamsForSelector]);

  const showTeamFilter = uniqueTeamsFromGames.length > 1;

  const display = () => {
    const leagues = leaguesAvailable || [];

    const dataTeams = {
      i: randomNumber(999999),
      items: teamsForSelector,
      itemsSelectedIds: [],
      itemSelectedId: teamSelected,
    };

    const dataTeamsFilter = {
      i: randomNumber(999999),
      items: [{ ...allOption, label: translateWord('all'), uniqueId: '' }, ...uniqueTeamsFromGames],
      itemsSelectedIds: [],
      itemSelectedId: teamFilter,
    };

    const showSingleColumn = visibleGamesByMonth.length <= 1;
    const widthStyle = showSingleColumn ? '50%' : '100%';

    const columnsData: ColumnData[] = visibleGamesByMonth.map(({ month, games }) => ({
      title: month,
      key: month,
      content: games.map((game, index) => {
        const gameId = game._id ?? randomNumber(999999);
        return (
          <CardLarge
            key={gameId}
            data={game}
            numberSelected={1}
            showButtons={true}
            showDate={true}
            animateEntry={true}
            delay={index * 15}
            forceShowScores={true}
          />
        );
      }),
    }));

    return (
      <div>
        <ThemedView>
          <div
            style={{
              width: '100%',
              margin: '0 auto',
              alignContent: 'center',
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}
          >
            <ThemedView>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '5px 15px 5px 15px',
                }}
              >
                <AppLogo />
                <PreviousScoreToggle value={showPreviousScores} onValueChange={handlePreviousScoreToggle} />
              </div>
              <div style={{ width: '100%', padding: isSmallDevice ? 0 : 10, boxSizing: 'border-box' }}>
                <ThemedElements style={{ width: '100%' }}>
                  <FilterSlider
                    selectedFilter={leagueOfSelectedTeam}
                    onFilterChange={handleLeagueSelectionChange}
                    availableLeagues={leagues}
                  />
                </ThemedElements>
                <Separator />
                <div
                  style={
                    isSmallDevice
                      ? { width: '100%' }
                      : { display: 'flex', flexDirection: 'row', alignItems: 'stretch', width: '100%' }
                  }
                >
                  <div style={{ width: isSmallDevice || !showTeamFilter ? '100%' : '50%' }}>
                    <TeamFilter
                      icon={<Ionicons name="search" size={24} color="white" />}
                      selectorData={dataTeams}
                      onSelectorChange={handleTeamSelectionChange}
                      selectorPlaceholder={translateWord('filterTeams')}
                      isClearable={false}
                      filterData={teamsForSelector.map((t) => ({
                        label: t.label === 'All' ? translateWord('all') : t.label,
                        value: t.uniqueId,
                      }))}
                      selectedFilter={teamSelected}
                      onFilterChange={handleTeamSelectionChange}
                      favoriteValues={favoriteTeams}
                    />
                  </div>

                  {showTeamFilter && (
                    <div style={{ width: isSmallDevice ? '100%' : '50%' }}>
                      <TeamFilter
                        icon={<FontAwesome6 name="people-arrows" size={18} color="white" />}
                        selectorData={dataTeamsFilter}
                        onSelectorChange={handleTeamFilterChange}
                        selectorPlaceholder={translateWord('filterTeams')}
                        isClearable={false}
                        filterData={[
                          { label: translateWord('all'), value: '' },
                          ...uniqueTeamsFromGames.map((t) => ({ label: t.label, value: t.uniqueId })),
                        ]}
                        selectedFilter={teamFilter}
                        onFilterChange={handleTeamFilterChange}
                        favoriteValues={favoriteTeams}
                      />
                    </div>
                  )}
                </div>
                {visibleGamesByMonth.length > 1 && (
                  <>
                    <Separator />
                    <FilterSlider
                      selectedFilter={monthFilter.length > 0 ? monthFilter[0] : 'ALL'}
                      onFilterChange={(value) => setMonthFilter(value === 'ALL' ? [] : [value])}
                      data={[
                        { label: translateWord('all'), value: 'ALL' },
                        ...visibleGamesByMonth.map((m) => ({ label: m.month, value: m.month })),
                      ]}
                      style={{ backgroundImage: 'none', backgroundColor: 'transparent' } as any}
                      itemStyle={{ borderWidth: 1, borderColor: 'transparent' }}
                      selectedItemStyle={{
                        backgroundColor: 'transparent',
                        borderWidth: 1,
                        borderColor: selectedBackgroundColor,
                      }}
                      textStyle={{
                        fontFamily:
                          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                        fontSize: 14,
                        textTransform: 'capitalize',
                      }}
                      selectedTextStyle={{
                        color: colorScheme === 'light' ? selectedBackgroundColor : '#ecedee',
                        fontWeight: 'bold',
                      }}
                    />
                  </>
                )}
              </div>
            </ThemedView>
          </div>
          {displayContent(columnsData, widthStyle)}
        </ThemedView>
      </div>
    );
  };

  const displayContent = (columnsData: ColumnData[], widthStyle: string) => {
    if (Object.keys(games).length === 0) {
      return (
        <div>
          <LoadingView />
        </div>
      );
    }

    if (visibleGamesByMonth.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      if (!games || (Object.keys(games).length === 1 && (games[today]?.[0]?.updateDate ?? '')) === '') {
        return (
          <div style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.3s' }}>
            <br />
            <NoResults />
          </div>
        );
      }
      return (
        <div style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.3s' }}>
          <br />
          <NoResults />
        </div>
      );
    }

    const filteredMonths =
      monthFilter.length > 0 ? visibleGamesByMonth.filter((m) => monthFilter.includes(m.month)) : visibleGamesByMonth;

    return (
      <div style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.3s' }}>
        {filteredMonths.map(({ month, games }, i) => (
          <div key={month} ref={(el) => (accordionRefs.current[i] = el)} style={{ width: '100%', margin: '0 auto' }}>
            <Accordion
              filter={month}
              i={i}
              gamesFiltred={games}
              open={monthFilter.length > 0 || (monthToFocusIndex !== -1 ? i === monthToFocusIndex : i === 0)}
              showDate={true}
              showTime={true}
              isCounted={true}
              showScores={true}
              forceShowScores={true}
            />
          </div>
        ))}
      </div>
    );
  };

  const removeOldGames = (games: FilterGames) => {
    const today = new Date().toISOString().split('T')[0];
    const keys = Object.keys(games);
    keys.forEach((key) => {
      if (key < today) {
        delete games[key];
      }
    });
    return games;
  };

  const getGamesFromApi = async (): Promise<void> => {
    if (teamSelected && teamSelected.length !== 0) {
      setIsLoading(true);
      try {
        let scheduleData: FilterGames;
        const scheduleDataStored = getCache<FilterGames>('scheduleData') || {};
        const scheduleKeys = Object.keys(scheduleDataStored);
        let thisLeagueTeams = structuredClone(leagueTeams);
        if (scheduleKeys) {
          const scheduleTeam = scheduleDataStored[scheduleKeys[0]]?.[0]?.teamSelectedId;
          const scheduleLeague = scheduleDataStored[scheduleKeys[0]]?.[0]?.league;
          const teamSelected = localStorage.getItem('teamSelected') || '';
          if (scheduleTeam === teamSelected || (teamSelected === 'all' && scheduleLeague === leagueOfSelectedTeam)) {
            setGames(removeOldGames(scheduleDataStored));
            setGamesTeamId(teamSelected);
          }
          setLeagueTeams([]);
        }
        if (teamSelected === 'all') {
          const storedLeague = localStorage.getItem('leagueSelected');
          const selectionLeague = storedLeague || leaguesAvailable[0];
          const smallScheduleData = await smallFetchRemainingGamesByLeague(selectionLeague);
          saveCache('scheduleData', smallScheduleData);
          setGames(removeOldGames(smallScheduleData));
          setGamesTeamId(teamSelected);
          setleagueOfSelectedTeam(selectionLeague);
          const remainingScheduleData = await fetchRemainingGamesByLeague(
            selectionLeague,
            undefined,
            50,
            undefined,
            true,
          );
          scheduleData = mergeGames(smallScheduleData, remainingScheduleData);
          if (showPreviousScores) {
            const resultsByLeague = await fetchResultsByLeague(selectionLeague);
            setResults(resultsByLeague);
          } else {
            setResults({});
          }
        } else {
          if (showPreviousScores) {
            const teamResultsByDay = await fetchResultsByTeam(teamSelected);
            setResults(teamResultsByDay);
          } else {
            setResults({});
          }
          scheduleData = await fetchRemainingGamesByTeam(teamSelected);
        }
        setLeagueTeams(thisLeagueTeams);
        const storedLeagues = getCache<string[]>('leaguesSelected');
        if (storedLeagues && storedLeagues.length > 0) {
          setLeaguesAvailable(storedLeagues);
        } else {
          fetchLeagues(setLeaguesAvailable);
        }
        if (Object.keys(scheduleData).length === 0) {
          const now = new Date().toISOString().split('T')[0];
          scheduleData[now] = [];
        }

        saveCache('scheduleData', scheduleData);

        setGames(removeOldGames(scheduleData));
        setGamesTeamId(teamSelected);
      } catch (error) {
        console.error('fetch games failed, using cached schedule if available', error);
        const scheduleData = getCache<FilterGames>('scheduleData');
        if (scheduleData) {
          setGames(scheduleData);
          setGamesTeamId(teamSelected);
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      // if no team selected yet, try to restore cached schedule so UI can show something
      const scheduleDataRaw = getCache<FilterGames>('scheduleData');
      if (scheduleDataRaw) {
        try {
          setGames(scheduleDataRaw);
        } catch (e) {
          console.error('cached schedule parse failed', e);
        }
      }
    }
  };

  const storeTeamSelected = (teamSelection: string, teamsList?: Team[]) => {
    if (!teamSelection) {
      setTeamSelected('');
      localStorage.removeItem('teamSelected');
      setLeagueTeams([]);
      setleagueOfSelectedTeam('');
      return;
    }

    const list = teamsList ?? teams;
    let newLeague = '';
    if (teamSelection === 'all') {
      newLeague = localStorage.getItem('leagueSelected') || '';
    } else {
      newLeague = list.find((t) => t.uniqueId === teamSelection)?.league ?? '';
    }

    // persist immediately
    localStorage.setItem('teamSelected', teamSelection);
    if (newLeague) {
      localStorage.setItem('leagueSelected', newLeague);
    }

    // update state once with derived values
    setTeamSelected(teamSelection);
    setleagueOfSelectedTeam(newLeague);
    const leagueFilter = list.filter(({ league }) => league === newLeague);
    allOption.league = newLeague;
    setLeagueTeams([allOption, ...leagueFilter]);
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        ref={scrollViewRef}
        onScroll={(event) => ActionButtonRef.current?.handleScroll(event)}
        scrollEventThrottle={16}
      >
        {display()}
      </ScrollView>
      <ActionButton ref={ActionButtonRef} scrollViewRef={scrollViewRef} />
    </ThemedView>
  );
}
